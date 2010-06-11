package play.modules.greenscript.utils;

import play.modules.greenscript.utils.DependencyManager;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import play.mvc.Before;
import play.mvc.Controller;

public class SessionManager {

	private Set<String> jsLoaded_ = new HashSet(); // store scripts which are loaded in this call
	private Set<String> jsGlobalLoaded_ = new HashSet(); //store all scripts which has ever been loaded throughout the http session
	private Set<String> jsMissing_ = new HashSet(); // store scripts to be loaded
	private List<String> cssScrn_ = new ArrayList();
	private List<String> cssPrit_ = new ArrayList();

	private boolean minimize_ = false;
	private String jsDir_ = "js";
	private String cssDir_ = "css";

	public SessionManager(String jsDir, String cssDir, boolean minimize) {
		jsDir_ = jsDir;
		cssDir_ = cssDir;
		minimize_ = minimize;
	}

	public String jsDir() {return jsDir_;}
	public String cssDir() {return cssDir_;};
	public boolean minimize() {return minimize_;}

	protected boolean addCss(List<String> list, String name) {
		for (String s:list) {
			if (s.equalsIgnoreCase(name)) return false;
		}
		list.add(name);
		return true;
	}

	public boolean addCss(String name, String media) {
		//throw new RuntimeException(String.format("name: %1$s, media: %2$s", name, media));
		return ("print".equalsIgnoreCase(media)) ? addPrintCss(name) : addScreenCss(name);
	}

	public boolean addJsLoaded(String name) {
	    //if (!jsGlobalLoaded_.add(name)) return false;
	    jsGlobalLoaded_.add(name);
		if(jsLoaded_.add(name)) {
			jsMissing_.remove(name);
			return true;
		}
		return false;
	}
	
	public void clearLoaded() {
	    jsLoaded_.clear();
	}

	public void addJsMissings(Collection<String> missings) {
		jsMissing_.addAll(missings);
		jsMissing_.removeAll(jsGlobalLoaded_);
	}
	
	public void addJsMissing(String name) {
	    jsMissing_.add(name);
	    jsMissing_.removeAll(jsGlobalLoaded_);
	}

	public List<String> getJsMissings() {
		List<String> ret = DependencyManager.JS_DEP_MGR.comprehend(jsMissing_, true);
		return ret;
	}

	public boolean addCss(String name) {return addScreenCss(name);}

	public boolean addScreenCss(String name){
		return addCss(cssScrn_, name);
	}

	public boolean addPrintCss(String name){
		return addCss(cssPrit_, name);
	}

	public List<String> getCssList(String media) {
		List<String> l =  comprehend_(media);
		return l;
	}

	private List<String> comprehend_(String media){
		return "print".equalsIgnoreCase(media) ?
				DependencyManager.CSS_DEP_MGR.comprehend(cssPrit_):
				DependencyManager.CSS_DEP_MGR.comprehend(cssScrn_);
	}
}
