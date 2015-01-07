import subprocess
import tornado.ioloop
import tornado.web

class MainHandler(tornado.web.RequestHandler):
    def git(*args):
        return subprocess.check_call(['git'] + list(args))

    def get(self):
        self.write("receive")
        git('pull')

application = tornado.web.Application([
    (r"/", MainHandler),
])

if __name__ == "__main__":
    application.listen(8765)
    tornado.ioloop.IOLoop.instance().start()

