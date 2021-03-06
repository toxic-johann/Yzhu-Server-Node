import subprocess
import tornado.ioloop
import tornado.web

class MainHandler(tornado.web.RequestHandler):
    def post(self):
        def git(*args):
            return subprocess.check_call(['git'] + list(args))\

        git('pull')

application = tornado.web.Application([
    (r"/", MainHandler),
])

if __name__ == "__main__":
    application.listen(8765)
    tornado.ioloop.IOLoop.instance().start()

