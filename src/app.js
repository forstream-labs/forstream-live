'use strict';

require('app-module-path/register');

const configs = require('configs');
const {mongo} = require('@forstream/models');
const {LiveStream} = require('@forstream/models').models;
const {logger, redis} = require('@forstream/commons');
const NodeMediaServer = require('node-media-server');
const _ = require('lodash');

const STREAM_PATH_REGEX = /\/live\/(.*)/;

logger.setup({level: configs.debug ? 'debug' : 'info', filename: 'forstream-live.log'});
mongo.setup({...configs.mongo, logger});
redis.setup({...configs.redis, logger});

async function setup() {
  logger.info('Finding live streams with status "live"...');
  const liveStreams = await LiveStream.find({stream_status: 'live'});
  logger.info('%s live streams found, building relay tasks...', liveStreams.length);
  const streamKeys = [];
  const tasks = _.compact(_.flatten(liveStreams.map((liveStream) => liveStream.providers.map((providerStream) => {
    if (!providerStream.stream_url) {
      return null;
    }
    streamKeys.push(liveStream.stream_key);
    return {
      app: 'live',
      name: liveStream.stream_key,
      mode: 'push',
      edge: providerStream.stream_url,
    };
  }))));
  logger.info('%s relay tasks built', liveStreams.length);

  logger.info('Updating live streams recording attribute to false...');
  await LiveStream.updateOne({stream_key: {$in: streamKeys}}, {recording: false});
  logger.info('Live streams recording attribute updated to false');

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

  mediaServer.on('postPublish', async (id, streamPath) => {
    const streamKey = streamPath.match(STREAM_PATH_REGEX)[1];
    await LiveStream.updateOne({stream_key: streamKey}, {recording: true});
    redis.getClient().publish('live_stream_recording', JSON.stringify({stream_key: streamKey}));
  });

  mediaServer.on('donePublish', async (id, streamPath) => {
    const streamKey = streamPath.match(STREAM_PATH_REGEX)[1];
    await LiveStream.updateOne({stream_key: streamKey}, {recording: false});
    redis.getClient().publish('live_stream_stop_recording', JSON.stringify({stream_key: streamKey}));
  });
}

mongo.on('connected', () => {
  setup();
});
