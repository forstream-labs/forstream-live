'use strict';

require('app-module-path/register');

const configs = require('configs');
const {mongo} = require('@forstream/models');
const {LiveStream} = require('@forstream/models').models;
const {logger} = require('@forstream/utils');
const NodeMediaServer = require('node-media-server');
const _ = require('lodash');

logger.create({level: configs.debug ? 'debug' : 'info', filename: 'forstream-media.log'});
mongo.setup({...configs.mongo, logger});

async function setup() {
  const liveStreams = await LiveStream.find({stream_status: {$in: ['ready', 'live']}});
  const tasks = _.compact(_.flatten(liveStreams.map((liveStream) => liveStream.providers.map((providerStream) => {
    if (!providerStream.stream_url) {
      return null;
    }
    return {
      app: 'live',
      name: liveStream.stream_key,
      mode: 'push',
      edge: providerStream.stream_url,
    };
  }))));

  console.log(tasks);

  const config = {
    logType: configs.debug ? 3 : 2,
    rtmp: {
      port: 1935,
      chunk_size: 60000,
      gop_cache: true,
      ping: 30,
      ping_timeout: 60,
    },
    http: {
      port: configs.port,
      allow_origin: '*',
    },
    relay: {
      ffmpeg: configs.ffmpegPath,
      tasks,
    },
  };

  var nms = new NodeMediaServer(config);
  nms.run();
}

setup();
