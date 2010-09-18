package play.modules.greenscript;

import java.lang.reflect.Method;

import org.apache.commons.configuration.Configuration;
import org.apache.commons.configuration.ConfigurationException;
import org.apache.commons.configuration.PropertiesConfiguration;

import play.Logger;
import play.Play;
import play.Play.Mode;
import play.PlayPlugin;
import play.exceptions.UnexpectedException;
import play.modules.greenscript.utils.DependencyManager;
import play.modules.greenscript.utils.Minimizor;
import play.modules.greenscript.utils.SessionManager;
import play.mvc.Scope;

/**
 * TODO: add JMX support
 * 
 * @author greenl
 */
public class GreenScriptPlugin extends PlayPlugin {

    private static GreenScriptPlugin instance_ = null;

    public static GreenScriptPlugin getInstance() {
        return instance_;
    }

    private Configuration conf_ = null;

    /*
     * The dir settings:
     * - Read only after configured
     */
    private static String jsDir_ = "/public/javascripts/";
    public static String getJsDir() {
        return jsDir_;
    }
    private static String cssDir_ = "/public/stylesheets/";
    public static String getCssDir() {
        return cssDir_;
    }    
    private static String gsDir_ = "/public/gs/";
    public static String getGsDir() {
        return gsDir_;
    }

    
    /*
     * minimizing toggles
     */
    private static boolean minimize_ = false;
    public static boolean getMinimizeSetting() {
        return minimize_;
    }
    public static void setMinimizeSetting(boolean minimize) {
        minimize_ = minimize;
    }
    public static boolean getCacheSetting() {
        return Minimizor.getCacheSetting();
    }
    public static void setCacheSetting(boolean cache) {
        Minimizor.setCacheSetting(cache);
    }
    public static boolean getCompressSetting() {
        return Minimizor.getCompressSetting();
    }
    public static void setCompressSetting(boolean compress) {
        Minimizor.setCompressSetting(compress);
    }

    public void configure(Configuration conf) {
        conf_ = conf;
        configure_(conf);
    }

    public Configuration getConfiguration() {
        return conf_;
    }

    private void configure_(Configuration c) {
        Configuration jsConf = c.subset("js");
        Configuration cssConf = c.subset("css");
        DependencyManager.configDependencies(jsConf, cssConf);

        jsDir_ = c.getString("greenscript.dir.js", "/public/javascripts/");
        if (!jsDir_.endsWith("/")) jsDir_ += "/";
        cssDir_ = c.getString("greenscript.dir.css", "/public/stylesheets/");
        if (!cssDir_.endsWith("/")) cssDir_ += "/";
        gsDir_ = c.getString("greenscript.dir.minimized", "/public/gs/");
        if (!gsDir_.endsWith("/")) gsDir_ += "/";
        Minimizor.setGsDir(gsDir_);

        minimize_ = c.getBoolean("greenscript.minimize", true);
        if (!minimize_)
            Logger.warn("GreenScript minimizing disabled");
        else
            Logger.info("GreenScript minimizing enabled");

        boolean cache = Play.mode == Mode.DEV ? false : true;
        if (c.containsKey("greenscript.cache")) {
            cache = c.getBoolean("greenscript.cache"); 
        } else if (c.containsKey("greenscript.nocache")) {
            cache =  !c.getBoolean("greenscript.nocache");
        }
        Minimizor.setCacheSetting(cache);

        boolean compress = c.getBoolean("greenscript.compress", true);
        Minimizor.setCompressSetting(compress);
    }

    @Override
    public void onConfigurationRead() {

        GreenScriptPlugin.instance_ = this;

        PropertiesConfiguration c = null;
        try {
            c = new PropertiesConfiguration("greenscript.conf");
        } catch (ConfigurationException e) {
            throw new UnexpectedException(e);
        }

        // read application.conf
        for (Object key : Play.configuration.keySet()) {
            String ks = (String) key;
            if (ks.startsWith("greenscript.")) {
                String v = Play.configuration.getProperty(ks);
                Logger.debug("[GreenScript]Loading application configuration: %1$s = %2$s", ks, v);
                c.setProperty(ks, v);
            }
        }

        configure(c);

        Logger.info("GreenScript module initialized");
    }

    @Override
    public void beforeActionInvocation(Method actionMethod) {
        Scope.RenderArgs.current().put("gsSM", new SessionManager(jsDir_, cssDir_, minimize_));
    }

}
