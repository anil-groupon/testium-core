import path from 'path';
import cp from 'child_process';

import assert from 'assertive';

import Config from '../../lib/config';
import App from '../../lib/processes/application';
import Proxy from '../../lib/processes/proxy';
import spawnServer from '../../lib/spawn-server';

import Bluebird from 'bluebird';

Bluebird.promisifyAll(cp);

const HELLO_WORLD = path.resolve(__dirname, '../../examples/hello-world');

describe('Proxy', () => {
  it('can generate spawn options', async () => {
    const config = new Config({ app: { port: 3041 } });
    const options = await Proxy.getOptions(config);
    assert.equal('Uses default port', 4445, options.port);
    assert.equal('Passes in the app port as the 2nd param to the child',
      '3041', options.commandArgs[1]);
    assert.equal(`http://127.0.0.1:${options.port}`, config.get('proxy.targetUrl'));
  });

  it('can generate remote-selenium spawn options', async () => {
    const config = new Config({
      app: { port: '3041' },
      selenium: { serverUrl: 'http://example.com' },
      proxy: { port: '0' },
    });
    const [options, hostname] = await Bluebird.all([
      Proxy.getOptions(config),
      cp.execFileAsync('hostname', ['-f'], { encoding: 'utf8' }).call('trim'),
    ]);
    assert.hasType('Finds an open port', Number, options.port);
    assert.expect('Port is no longer 0', options.port > 0);
    assert.notEqual('Port is not default', 4445, options.port);
    assert.equal(`http://${hostname}:${options.port}`,
                 config.get('proxy.targetUrl'));
  });

  it('can actually spawn', async () => {
    const config = new Config({
      root: HELLO_WORLD,
      app: { port: '3041' },
      proxy: { port: '0' },
    });
    const { proxy, application } = await spawnServer(config, [Proxy, App]);
    proxy.rawProcess.kill();
    application.rawProcess.kill();
  });

  it('can use an already tunneled port', async () => {
    const config = new Config({
      root: HELLO_WORLD,
      app: { port: '3041' },
      driver: 'wd',
      proxy: { port: '0', tunnel: { host: 'tun-host', port: '4242' } },
    });
    const { proxy, application } = await spawnServer(config, [Proxy, App]);
    assert.equal('http://tun-host:4242', proxy.launchArguments[3]);
    proxy.rawProcess.kill();
    application.rawProcess.kill();
  });

  // TODO: something with ./ssh-server
  it('can open an ssh tunnel to the proxy');
});
