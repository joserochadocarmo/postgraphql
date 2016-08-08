import {
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLInputType,
  GraphQLFieldConfig,
  GraphQLNonNull,
  GraphQLID,
  GraphQLArgumentConfig,
} from 'graphql'

import {
  Collection,
  ObjectType,
  ObjectField,
  Relation
} from '../../catalog'

import memoize from '../utils/memoize'
import buildObject from '../utils/buildObject'
import * as formatName from '../utils/formatName'
import * as id from '../utils/id'
import TypeForge from './TypeForge'
import NodeForge from './NodeForge'

/**
 * The collection forge will create GraphQL types out of collections.
 */
class CollectionForge {
  constructor (
    private _typeForge: TypeForge,
    private _nodeForge: NodeForge,
  ) {}

  /**
   * Creates any number of query field entries for a collection. These fields
   * will be on the root query type.
   */
  public createRootFieldEntries <T>(collection: Collection<T>): [string, GraphQLFieldConfig<any, any>][] {
    const type = collection.getType()
    const entries: [string, GraphQLFieldConfig<any, any>][] = []
    const primaryKey = collection.getPrimaryKey()

    // if (collection.canReadMany()) {
    //   entries.push([formatName.field(`all-${collection.getName()}`), {
    //     type: this._connectionForge.createConnection(),
    //   }])
    // }

    // Add a field to select our collection by its primary key, if the
    // collection has a primary key. Note that we abstract away the shape of
    // the primary key in this instance. Instead using a GraphQL native format,
    // the `__id` format.
    if (primaryKey) {
      entries.push([formatName.field(type.getName()), {
        // TODO: description
        type: this.getType(collection),
        args: {
          __id: {
            // TODO: description,
            type: new GraphQLNonNull(GraphQLID),
          },
        },
        resolve: (source, { __id }) => {
          const { name, key } = id.deserialize(__id)

          if (name !== collection.getName())
            throw new Error(`__id is for collection '${name}', not expected collection '${collection.getName()}'.`)

          return primaryKey.read(key)
        },
      }])
    }

    // Add a field to select any value in the collection by any key. So all
    // unique keys of an object will be usable to select a single value.
    for (const key of collection.getKeys()) {
      const keyName = key.getName()
      const keyType = key.getType()
      const fields = keyType instanceof ObjectType && keyType.getFields()

      entries.push([formatName.field(`${type.getName()}-by-${keyName}`), {
        // TODO: description
        type: this.getType(collection),

        args:
          keyType instanceof ObjectType
            // If the key’s type is an object type, let’s flatten the fields
            // into arguments.
            ? buildObject<GraphQLArgumentConfig<any>>(
              fields.map<[string, GraphQLArgumentConfig<any>]>(field =>
                [formatName.arg(field.getName()), {
                  description: field.getDescription(),
                  type: this._typeForge.getInputType(field.getType()),
                }]
              )
            )
            // If the key’s type was not an object type, let’s just use a single
            // argument.
            : {
              [formatName.arg(keyName)]: {
                // TODO: description
                type: this._typeForge.getInputType(keyType),
              },
            },

        resolve: (source, args) => {
          // Get the value of the key from our arguments. If the type was an
          // object type we have to build our object from the flattened fields.
          const keyValue =
            keyType instanceof ObjectType
              ? keyType.createFromFieldValues(fields.map(field => args[field.getName()]))
              : args[formatName.arg(keyName)]

          return key.read(keyValue)
        },
      }])
    }

    // TODO: Connection fields

    return entries
  }

  /**
   * Creates the output object type for a collection. This type will include all
   * of the fields in the object, as well as an `__id` field, computed columns,
   * and relations (head and tail).
   */
  @memoize
  public getType <T>(collection: Collection<T>): GraphQLObjectType<T> {
    const type = collection.getType()
    const primaryKey = collection.getPrimaryKey()

    return new GraphQLObjectType<T>({
      name: formatName.type(type.getName()),
      description: type.getDescription(),

      isTypeOf: value => type.isTypeOf(value),

      // If there is a primary key, this is a node.
      interfaces: primaryKey ? [this._nodeForge.getInterfaceType()] : [],

      fields: buildObject<GraphQLFieldConfig<T, any>>(
        // Our `__id` field. It is powered by the collection’s primary key. If
        // we have no primary key, we have no `__id` field.
        primaryKey ? [
          ['__id', {
            // TODO: description
            type: new GraphQLNonNull(GraphQLID),
            resolve: value =>
              id.serialize({
                name: collection.getName(),
                key: primaryKey.getKeyForValue(value),
              }),
          }],
        ] : [],
        // Add all of the basic fields to our type.
        type.getFields().map(<O, F>(field: ObjectField<O, F>): [string, GraphQLFieldConfig<O, F>] =>
          [formatName.field(field.getName()), {
            description: field.getDescription(),
            type: this._typeForge.getOutputType(field.getType()),
            resolve: value => field.getFieldValueFromObject(value),
          }]
        ),
        // TODO: Computed columns
        // Add all of our many-to-one relations (aka tail relations).
        collection.getTailRelations().map(
          <T, H, K>(relation: Relation<T, H, K>): [string, GraphQLFieldConfig<T, H>] => {
            const headCollectionKey = relation.getHeadCollectionKey()
            const headCollection = headCollectionKey.getCollection()

            return [formatName.field(relation.getName()), {
              // TODO: description
              type: this.getType(headCollection),
              resolve: source => {
                const key = relation.getHeadKeyFromTailValue(source)
                return headCollectionKey.read(key)
              },
            }]
          }
        ),
        // TODO: Head relations
      ),
    })
  }
}

export default CollectionForge
