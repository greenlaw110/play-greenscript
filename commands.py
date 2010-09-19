# greenscript

import getopt
from play.utils import *

COMMANDS = ['greenscript:cp', 'greenscript:copy']

HELP = {
    'greenscript:copy': 'copy tags or templates to your app'
}

# ~~~~~~~~~~~~~~~~~~~~~~ [greenscript:cp] Copy tags or templates
def execute(**kargs):
    app = kargs.get("app")
    remaining_args = kargs.get("args")
    play_env = kargs.get("env")

    try:
        optlist, args = getopt.getopt(remaining_args, 't:a:', ['template=', 'tag='])
        for o, a in optlist:
            if o in ('-a', '--tag'):
                if a == '.':
                    toDir = 'app/views/tags' 
                else:
                    toDir = 'app/views/tags/%s' % a
                fromDir = 'app/views/tags/greenscript'
                for f in ('js.html', 'css.html'):
                    app.override('%s/%s' % (fromDir, f), '%s/%s' % (toDir, f))
                print "~ "
                return
                
            if o in ('-t', '--template'):
                app.override('app/views/greenscript/Configurator/configure.html', 'app/views/%s/configure.html' % a)
                print "~ "
                return

    except getopt.GetoptError, err:
        print "~ %s" % str(err)
        print "~ "
        sys.exit(-1)

    print "~ Copy greenscript tag or configurator template to your app" 
    print "~ "
