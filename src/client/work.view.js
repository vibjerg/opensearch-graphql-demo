import React from 'react';
import ReactDOM from 'react-dom';
import GraphiQL from 'graphiql';
import fetch from 'isomorphic-fetch';
import Relay from 'react-relay';

import 'graphiql/graphiql.css';

function graphQLFetcher(graphQLParams) {
  return fetch(window.location.origin + '/graphql', {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(graphQLParams),
  }).then(response => response.json());
}

class test {
  static hest = 'test'
}

ReactDOM.render(<GraphiQL fetcher={graphQLFetcher} />, document.body);