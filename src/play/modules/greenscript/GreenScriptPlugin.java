package play.modules.greenscript;

import java.lang.reflect.Method;

import play.modules.greenscript.utils.DependencyManager;
import play.modules.greenscript.utils.Minimizor;

import org.apache.commons.configuration.Configuration;
import org.apache.commons.configuration.ConfigurationException;
import org.apache.commons.configuration.PropertiesConfiguration;

import controllers.SessionManager;

import play.Logger;
import play.Play;
import play.PlayPlugin;
import play.Play.Mode;
import play.mvc.Scope;

public class GreenScriptPlugin extends PlayPlugin {
	
	private static String jsDir_ = "js";
	private static String cssDir_ = "css";
	private static boolean minimize_ = false;
	
	public static String getJsDir() {return jsDir_;}
	
	public static String getCssDir() {return cssDir_;} 
	
	@Override
	public void onApplicationStart() {
		Configuration c = null;
		try {
			c = new PropertiesConfiguration("greenscript.conf");
		} catch (ConfigurationException e) {
			e.printStackTrace();
		}
		
		if (null == c) return;
		
		Configuration jsConf = c.subset("js");
		Configuration cssConf = c.subset("css");
		DependencyManager.configDependencies(jsConf, cssConf);
		
		minimize_ = c.getBoolean("gs.minimize.enabled", true);		
		jsDir_ = c.getString("gs.dir.js", "js");
		cssDir_ = c.getString("gs.dir.css", "css");
		
		boolean nocache = Play.mode == Mode.DEV && c.getBoolean("gs.nocache");
		Minimizor.setNoCache(nocache);
		
		boolean compress = Play.mode == Mode.DEV && c.getBoolean("gs.compress");
		Minimizor.setCompress(compress);
		Logger.trace("greenscript module initialized");
	}
	
	@Override
	public void beforeActionInvocation(Method actionMethod) {
		Scope.RenderArgs.current().put("gsSM", new SessionManager(jsDir_, cssDir_, minimize_));
		Logger.trace("greenscript Session Manager ready");
	}
	
}
