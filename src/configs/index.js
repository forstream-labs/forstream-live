'use strict';

const path = require('path');
const yaml = require('yamljs');
const _ = require('lodash');

const configs = yaml.load(path.resolve('configs.yml'));

function get(property, defaultValue) {
  return _.get(configs, property, defaultValue);
}

function getRequired(property) {
  const value = _.get(configs, property);
  if (!value) {
    throw new Error(`Property "${property}" is required`);
  }
  return value;
}

exports.env = get('app.env', 'development');
exports.port = get('app.port', 5000);
exports.debug = get('app.debug', false);

exports.ffmpegPath = get('ffmpegPath', '/usr/bin/ffmpeg');

exports.mongo = {
  host: get('mongo.host', 'localhost'),
  port: get('mongo.port', 27017),
  schema: get('mongo.schema', 'forstream'),
  options: get('mongo.options', ''),
  cert: get('mongo.cert'),
  username: get('mongo.username'),
  password: get('mongo.password'),
  debug: get('mongo.debug', false),
};
