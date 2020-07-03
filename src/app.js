'use strict';

require('app-module-path/register');

const configs = require('configs');
const {mongo} = require('@forstream/models');
const {LiveStream} = require('@forstream/models').models;
const {logger} = require('@forstream/utils');
const NodeMediaServer = require('node-media-server');
const _ = require('lodash');

logger.setup({level: configs.debug ? 'debug' : 'info', filename: 'forstream-live.log'});
mongo.setup({...configs.mongo, logger});

async function setup() {
  logger.info('Finding live streams with status "live"...');
  const liveStreams = await LiveStream.find({stream_status: 'live'});
  logger.info('%s live streams found, building relay tasks...', liveStreams.length);
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
  logger.info('%s relay tasks built', liveStreams.length);

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
      tasks,
      ffmpeg: configs.ffmpegPath,
    },
  };

  const mediaServer = new NodeMediaServer(config);
  mediaServer.run();
}

setup();
