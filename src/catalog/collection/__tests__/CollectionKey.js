import test from 'ava'
import CollectionKey from '../CollectionKey'

test('getName will get the key name', t => {
  const name = Symbol('name')
  const collection = Symbol('collection')
  const collectionKey = new CollectionKey(collection, name)
  t.is(collectionKey.getName(), name)
})

test('getCollection will get the key collection', t => {
  const name = Symbol('name')
  const collection = Symbol('collection')
  const collectionKey = new CollectionKey(collection, name)
  t.is(collectionKey.getCollection(), collection)
})

test('setDescription will set the description', t => {
  const description = Symbol('description')
  const collectionKey = new CollectionKey()
  t.is(collectionKey.getDescription(), undefined)
  collectionKey.setDescription(description)
  t.is(collectionKey.getDescription(), description)
})
