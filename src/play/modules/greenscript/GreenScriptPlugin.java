package play.modules.greenscript;

import java.lang.reflect.Method;
import java.util.Properties;

import org.apache.commons.configuration.Configuration;
import org.apache.commons.configuration.ConfigurationException;
import org.apache.commons.configuration.PropertiesConfiguration;

import play.Logger;
import play.Play;
import play.PlayPlugin;
import play.Play.Mode;
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
    public static GreenScriptPlugin getInstance() {return instance_;}

    private static String jsDir_ = "js";
    private static String cssDir_ = "css";
    
    private Configuration conf_ = null;

    private static boolean minimize_ = false;

    public static String getJsDir() {
	return jsDir_;
    }

    public static String getCssDir() {
	return cssDir_;
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

	minimize_ = c.getBoolean("gs.minimize.enabled", true);
	jsDir_ = c.getString("gs.dir.js", "js");
	cssDir_ = c.getString("gs.dir.css", "css");
	
	if (!minimize_) 
	    Logger.warn("GreenScript minimizing disabled");
	else 
	    Logger.info("GreenScript minimizing enabled");

	boolean nocache = Play.mode == Mode.DEV && c.getBoolean("gs.nocache");
	Minimizor.setNoCache(nocache);

	boolean compress = c.getBoolean("gs.compress");
	Minimizor.setCompress(compress);
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
	for (Object key: Play.configuration.keySet()) {
	    String ks = (String)key;
	    if (ks.startsWith("gs.")) {
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
	Scope.RenderArgs.current().put("gsSM",
		new SessionManager(jsDir_, cssDir_, minimize_));
    }

}
