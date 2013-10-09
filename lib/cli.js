#!/usr/bin/env node

var pkg_file = '../package.yaml';
var fs = require('fs');
var yaml = require('js-yaml');
var commander = require('commander');
var server = require('../lib/index');
var crypto = require('crypto');
var pkg = require(pkg_file);

commander
	.option('-l, --listen <[host:]port>', 'host:port number to listen on (default: localhost:4873)')
	.option('-c, --config <config.yaml>', 'use this configuration file (default: ./config.yaml)')
	.version(pkg.version)
	.parse(process.argv);

if (commander.args.length == 1 && !commander.config) {
	// handling "sinopia [config]" case if "-c" is missing in commandline
	commander.config = commander.args.pop();
}

if (commander.args.length != 0) {
	commander.help();
}

try {
	var config, config_path;
	if (commander.config) {
		config_path = commander.config;
		config = yaml.safeLoad(fs.readFileSync(config_path, 'utf8'));
	} else {
		config_path = './config.yaml';
		try {
			config = yaml.safeLoad(fs.readFileSync(config_path, 'utf8'));
		} catch(err) {
			var created_config = require('../lib/config_gen')();
			config = yaml.safeLoad(created_config.yaml);
			console.log('starting with default config, use user: "%s", pass: "%s" to authenticate', created_config.user, created_config.pass);
			fs.writeFileSync(config_path, created_config.yaml);
		}
	}
} catch(err) {
	if (err.code === 'ENOENT') {
		console.error('ERROR: cannot open configuration file "'+config_path+'", file not found');
		process.exit(1);
	} else {
		throw err;
	}
}
if (!config.user_agent) config.user_agent = 'Sinopia/'+pkg.version;
if (!config.self_path) config.self_path = config_path;

// command line || config file || default
var hostport = commander.listen || String(config.listen || '') || '4873';

hostport = hostport.split(':');
if (hostport.length < 2) {
	hostport = [undefined, hostport[0]];
}
if (hostport[0] == null) {
	hostport[0] = 'localhost';
}
server(config).listen(hostport[1], hostport[0]);
console.log('Server is listening on http://%s:%s/', hostport[0], hostport[1]);

// undocumented stuff for tests
if (typeof(process.send) === 'function') {
	process.send({sinopia_started: hostport});
}
