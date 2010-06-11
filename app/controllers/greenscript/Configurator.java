package controllers.greenscript;

import java.io.StringReader;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import org.apache.commons.configuration.Configuration;
import org.apache.commons.configuration.PropertiesConfiguration;

import play.modules.greenscript.GreenScriptPlugin;
import play.mvc.Controller;

public class Configurator extends Controller {
    public static void get() {
	GreenScriptPlugin gs = GreenScriptPlugin.getInstance();
	Configuration conf = gs.getConfiguration();
	List<String> rows = new ArrayList();
	for (Iterator itr = conf.getKeys(); itr.hasNext(); ){
	    String key = (String)itr.next();
	    StringBuilder sb = new StringBuilder(key);
	    sb.append("=");
	    String[] array = conf.getStringArray(key);
	    String val = null;
	    for (String s: array) {
		if (null == val) val = s;
		else val = val + ',' + s;
	    }
	    sb.append(val);
	    rows.add(sb.toString());
	}
	render(conf, rows);
    }
    
    public static void update() {
	GreenScriptPlugin gs = GreenScriptPlugin.getInstance();
	String s = params.get("configuration");
	PropertiesConfiguration pc = new PropertiesConfiguration();
	try {
	    pc.load(new StringReader(s));
	    gs.configure(pc);
	    flash.success("configuration updated");
	    flash.keep();
	} catch (Exception e) {
	    flash.error("Error update configuration: %1$s", e.getMessage());
	    flash.keep();
	}
	get();
    }
}
