// react
import React from 'react';
import ReactDOM from 'react-dom';

// redux
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import thunkMiddleware from 'redux-thunk';
import createLogger from 'redux-logger';
import appReducers from './redux/reducers';
import { updateUser } from './redux/actions';

// routing
import routes from './routes';
import {Router, browserHistory} from 'react-router';

// firebase auth
import {auth} from '../database/database_init';

// setting up the redux store
let store = createStore (appReducers,
    applyMiddleware(
        thunkMiddleware,
        createLogger()
    )
);


// firebase user status listener
auth.onAuthStateChanged(function(user) {
    if (user) {

        console.log (user.displayName);

        // first log in
        var username = user.email.substring (0, user.email.length-9);
        if (user.displayName === null) {
            console.log ('username undefined');
            // create profile if not already defined
            auth.currentUser.updateProfile({
                displayName: username,
                instructorFor: [],
                favorites: [],
                questions: [],
                answers: []
            }).then(function() {
                console.log ('Profile creation successful');
                store.dispatch (updateUser(user.displayName));
            }, function(error) {
                console.log ('Profile creation unsuccessful: '+error);
            });
        }

        else {
            store.dispatch (updateUser(user.displayName));
        }
    }
});


// React main class and router
class Augcast extends React.Component {
    render () {
        return (
            <Provider store={store} >
                <Router routes={routes} history={browserHistory}/>
            </Provider>

        );
    }
}


/**
 * gets login state from store and redirects route
 *
 * nextState: current state of the router
 * replace: triggers transition to different URL
 * callback: continues transition
 */
export function authenticate (nextState, replace, transition) {
    let {loggedIn} = store.getState();
    console.log (loggedIn);
    if (!loggedIn) {
        console.log ('replacing with login');
        replace ('/login');
    }

    transition();
}

ReactDOM.render (<Augcast/>, document.getElementById('app'));
