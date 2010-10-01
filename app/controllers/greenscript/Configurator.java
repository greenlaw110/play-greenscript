package controllers.greenscript;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import org.apache.commons.configuration.Configuration;

import play.modules.greenscript.GreenScriptPlugin;
import play.mvc.Controller;

public class Configurator extends Controller {

    public static void configure() {
        GreenScriptPlugin gs = GreenScriptPlugin.getInstance();
        Configuration conf = gs.getConfiguration();
        
        // js and css dependencies
        List<String> jsDeps = new ArrayList<String>();
        List<String> cssDeps = new ArrayList<String>();
        for (Iterator<?> itr = conf.getKeys(); itr.hasNext();) {
            String key = (String) itr.next();
            if (key.startsWith("js") || key.startsWith("css")) {
                StringBuilder sb = new StringBuilder(key);
                sb.append("=");
                String[] array = conf.getStringArray(key);
                String val = null;
                for (String s : array) {
                    if (null == val)
                        val = s;
                    else
                        val = val + ',' + s;
                }
                sb.append(val);
                if (key.startsWith("js"))
                    jsDeps.add(sb.toString());
                else
                    cssDeps.add(sb.toString());
            }
        }
        
        // dir settings
        String jsDir = GreenScriptPlugin.getJsDir();
        String cssDir = GreenScriptPlugin.getCssDir();
        String gsDir = GreenScriptPlugin.getGsDir();
        
        // url settings
        String jsUrl = GreenScriptPlugin.getJsUrl();
        String cssUrl = GreenScriptPlugin.getCssUrl();
        String gsUrl = GreenScriptPlugin.getGsUrl();
        
        // minimizing toggles
        boolean minimize = GreenScriptPlugin.getMinimizeSetting();
        boolean compress = GreenScriptPlugin.getCompressSetting();
        boolean cache = GreenScriptPlugin.getCacheSetting();
        render(conf, cssDeps, jsDeps, jsDir, cssDir, gsDir, jsUrl, cssUrl, gsUrl, minimize, compress, cache);
    }

    public static void update(boolean minimize, boolean compress, boolean cache) {
        GreenScriptPlugin.setMinimizeSetting(minimize);
        GreenScriptPlugin.setCompressSetting(compress);
        GreenScriptPlugin.setCacheSetting(cache);
        flash.success("Setting updated");
        flash.keep();
        configure();
    }
}
