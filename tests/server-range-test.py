#!/usr/bin/env python3
"""Focused integration checks of the development server's real HTTP byte ranges."""
import importlib.util
import tempfile
import threading
import unittest
from functools import partial
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, build_opener, ProxyHandler
from http.server import ThreadingHTTPServer

spec=importlib.util.spec_from_file_location('paganini_server',Path(__file__).resolve().parents[1]/'tools/serve.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class RangeServerTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.temp=tempfile.TemporaryDirectory();cls.data=bytes(range(256))*5
  Path(cls.temp.name,'audio.mp3').write_bytes(cls.data)
  handler=partial(module.RangeRequestHandler,directory=cls.temp.name)
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),handler)
  cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
  cls.base=f'http://127.0.0.1:{cls.server.server_port}/audio.mp3';cls.http=build_opener(ProxyHandler({}))
 @classmethod
 def tearDownClass(cls):
  cls.server.shutdown();cls.server.server_close();cls.thread.join();cls.temp.cleanup()
 def request(self,range=None,method='GET',path=None):
  return self.http.open(Request(path or self.base,headers={'Range':range} if range else {},method=method),timeout=3)
 def test_full(self):
  with self.request() as r:self.assertEqual((r.status,r.headers['Accept-Ranges'],r.read()),(200,'bytes',self.data))
 def test_start_end(self):
  with self.request('bytes=19-42') as r:
   self.assertEqual(r.status,206);self.assertEqual(r.headers['Content-Range'],'bytes 19-42/1280');self.assertEqual(r.read(),self.data[19:43])
 def test_suffix_and_open_end(self):
  for requested,expected in [('bytes=-17',self.data[-17:]),('bytes=1260-',self.data[1260:]),('bytes=1270-9999',self.data[1270:])]:
   with self.subTest(requested=requested),self.request(requested) as r:self.assertEqual(r.status,206);self.assertEqual(r.read(),expected)
 def test_head(self):
  with self.request('bytes=4-8',method='HEAD') as r:self.assertEqual(r.status,206);self.assertEqual(r.headers['Content-Length'],'5');self.assertEqual(r.read(),b'')
 def test_unsatisfiable(self):
  for requested in ['bytes=99999-','bytes=9-2','bytes=-0','bytes=-']:
   with self.subTest(requested=requested),self.assertRaises(HTTPError) as error:self.request(requested)
   self.assertEqual(error.exception.code,416);self.assertEqual(error.exception.headers['Content-Range'],'bytes */1280')
 def test_traversal_does_not_escape(self):
  with self.assertRaises(HTTPError) as error:self.request(path=self.base.rsplit('/',1)[0]+'/%2e%2e/etc/passwd')
  self.assertEqual(error.exception.code,404)

if __name__=='__main__':unittest.main()
