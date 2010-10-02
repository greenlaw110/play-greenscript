package play.modules.greenscript;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import org.apache.commons.configuration.Configuration;
import org.apache.commons.configuration.ConfigurationException;
import org.apache.commons.configuration.PropertiesConfiguration;

import play.Logger;
import play.Play;
import play.Play.Mode;
import play.PlayPlugin;
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
     * The url settings
     * - Read only after configured
     * 
     * By default url settings reuse dir settings
     */
    private static String jsUrl_ = jsDir_;
    public static String getJsUrl() {
        return jsUrl_;
    }
    private static String cssUrl_ = cssDir_;
    public static String getCssUrl() {
        return cssUrl_;
    }
    private static String gsUrl_ = gsDir_;
    public static String getGsUrl() {
        return gsUrl_;
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

        /*
         * Dir configuration
         */
        jsDir_ = c.getString("greenscript.dir.js", "/public/javascripts/");
        if (!jsDir_.endsWith("/")) jsDir_ += "/";
        cssDir_ = c.getString("greenscript.dir.css", "/public/stylesheets/");
        if (!cssDir_.endsWith("/")) cssDir_ += "/";
        gsDir_ = c.getString("greenscript.dir.minimized", "/public/gs/");
        if (!gsDir_.endsWith("/")) gsDir_ += "/";
        
        /*
         * URL configuration
         */
        jsUrl_ = c.getString("greenscript.url.js", jsDir_);
        if (!jsUrl_.endsWith("/")) jsUrl_ += "/";
        cssUrl_ = c.getString("greenscript.url.css", cssDir_);
        if (!cssUrl_.endsWith("/")) cssUrl_ += "/";
        gsUrl_ = c.getString("greenscript.url.minimized", gsDir_);
        if (!gsUrl_.endsWith("/")) gsUrl_ += "/";
        
        Minimizor.setGsDir(gsDir_);

        minimize_ = c.getBoolean("greenscript.minimize", Play.mode == Mode.PROD);
        if (!minimize_)
            Logger.warn("GreenScript minimizing disabled");
        else
            Logger.info("GreenScript minimizing enabled");

        boolean cache = Play.mode == Mode.PROD;
        if (c.containsKey("greenscript.cache")) {
            cache = c.getBoolean("greenscript.cache"); 
        } else if (c.containsKey("greenscript.nocache")) {
            cache =  !c.getBoolean("greenscript.nocache");
        }
        Minimizor.setCacheSetting(cache);

        boolean compress = c.getBoolean("greenscript.compress", Play.mode == Mode.PROD);
        Minimizor.setCompressSetting(compress);
    }
    
    public void reloadDependency() {
        // rebuild dependencies
        PropertiesConfiguration c = null;
        try {
            c = new PropertiesConfiguration("greenscript.conf");
        } catch (ConfigurationException e) {
            //throw new UnexpectedException(e);
            // enable zero configuration
            c = new PropertiesConfiguration();
        }
        Configuration jsConf = c.subset("js");
        Configuration cssConf = c.subset("css");
        DependencyManager.configDependencies(jsConf, cssConf);
        
        // refresh configuration (for the sake of web configurator presentation purpose)
        List<String> toBeRemoved = new ArrayList<String>();
        for (Iterator<?> itr = conf_.getKeys("js"); itr.hasNext(); ) {
            toBeRemoved.add((String)itr.next());
        }
        for (Iterator<?> itr = conf_.getKeys("css"); itr.hasNext(); ) {
            toBeRemoved.add((String)itr.next());
        }
        for (String s: toBeRemoved) {
            conf_.clearProperty(s);
        }
        for (Iterator<?> itr = c.getKeys(); itr.hasNext();) {
            String key = (String)itr.next();
            conf_.addProperty(key, c.getProperty(key));
        }
    }

    @Override
    public void onConfigurationRead() {

        GreenScriptPlugin.instance_ = this;

        PropertiesConfiguration c = null;
        try {
            c = new PropertiesConfiguration("greenscript.conf");
        } catch (ConfigurationException e) {
            //throw new UnexpectedException(e);
            // enable zero configuration
            c = new PropertiesConfiguration();
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
        Scope.RenderArgs.current().put("gsSM", new SessionManager(jsUrl_, cssUrl_, minimize_));
    }

}
