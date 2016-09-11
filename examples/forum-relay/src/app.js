import React from 'react'
import Relay from 'react-relay'
import { render } from 'react-dom'
import { Router, Route, Redirect, IndexRoute, browserHistory, applyRouterMiddleware } from 'react-router'
import useRelay from 'react-router-relay'
import App from './components/App'
import PostIndexPage from './components/PostIndexPage'
import PostPage from './components/PostPage'
import { ViewerQueries, PostQueries } from './queries'
import './styles.css' // global css

const routes = (
  <Route path="/" component={App}>
    <IndexRoute
      component={PostIndexPage}
      queries={ViewerQueries}
    />
    <Route
      path=":postId"
      component={PostPage}
      queries={PostQueries}
    />
  </Route>
)

const mountNode = document.getElementById('root')

render(
  <Router
    history={browserHistory}
    routes={routes}
    render={applyRouterMiddleware(useRelay)}
    environment={Relay.Store}
  />,
  mountNode
)
