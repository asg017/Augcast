import express from 'express';
import morgan from 'morgan';
import path from 'path';
import authentication from './routes/authentication';
import { adminDatabase } from './database/admin_database_init';
var bodyParser = require('body-parser');
//import labelHandler from './labeler/labelHandler';

// eslint-disable-next-line
import React from 'react';     // jsx rendered as React.createElement

let __dirname = path.resolve();

var app = express();
var router = express.Router();  //Instance of Express Router
// Configure app to use bodyParser()
// This will let us get the data from a POST request
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/css', express.static(__dirname + '/public/css/'));
app.use('/api/login', authentication);

app.use(express.static(path.join(__dirname, 'public')));


router.get('/', function(req, res) {
    res.json({ message: 'API works'});
});

router.route('/testadmindb').post(function(req, res) {

    adminDatabase.ref('/test/python').update({
        labelProgress: 50
    });

    res.json({ message: 'Admin DB at '
        + new Date().toLocaleString() + ': ' + JSON.stringify(req.body)});
});

router.route('/label').post(function(req, res) {
    // Create a new Python thread and run labeling script
    var PythonShell = require('python-shell');
    // Configure the python script's arguments
    var options = {
        mode: 'text',
        args: [req.body.pdf, req.body.media, req.body.courseID, req.body.lectureID]
    };
    var pyshell = new PythonShell('./labeler/stdoutTest.py', options);

    // Listen to script's stdout, which outputs percentage of labeling complete.
    // Whenever updated, upload progress to Firebase so frontend can display
    // the progress of the labeling.
    pyshell.on('message', function (pythonStdout) {
        // received a message sent from the Python script (a simple "print" statement)
        var split = pythonStdout.split('#');
        //console.log('Python stdout: ' + split);

        // If the stdout starts with {, that means the final result is being printed.
        // Upload the final timestamps to the timestamps key
        if (split[0] === 'progress') {
            console.log('Updating ' + '/lectures/'+split[1]+'/'+split[2] + '.timestamps: ' + split[3]);
            adminDatabase.ref('/lectures/'+split[1]+'/'+split[2]).update({
                labelProgress: Number(split[3])
            });
        }
        // Else, the progress as a percent is being printed.
        // Upload the progress to the labelProgress key
        else if (split[0] === 'result'){
            console.log('Updating ' + '/lectures/'+split[1]+'/'+split[2] + '.labelProgress: ' + split[3]);

            adminDatabase.ref('/lectures/'+split[1]+'/'+split[2]).update({
                timestamps: JSON.parse(split[3])
            });
        }
    });

    // When the script's stdout is closed, the script has finished.
    // Set the progress to 100, signifying completion.
    pyshell.end(function (err) {
        if (err) throw err;
        console.log('Finished python script');
    });

    // Send response to button press (not important what that is)
    console.log('API /label: ' + JSON.stringify(req.body));
    res.json({ message: 'Started labeling at '
        + new Date().toLocaleString() + ': ' + JSON.stringify(req.body)});

});
//res.json({ message: 'Label API received request body at ' + new Date().toLocaleString() + ': ' + JSON.stringify(req.body)});

app.use('/api', router);

// morgan logs requests to the console
app.use(morgan('dev'));

// send all requests to index.html so browserHistory in React Router works
app.get('*', function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// listen
var PORT = process.env.PORT || 8080;
app.listen(PORT, function() {
    console.log('Production Express server running at localhost:' + PORT);
});
