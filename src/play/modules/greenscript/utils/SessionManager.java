package play.modules.greenscript.utils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class SessionManager {

	private Set<String> jsLoaded_ = new HashSet<String>(); // store scripts which are loaded in this call
	private Set<String> jsGlobalLoaded_ = new HashSet<String>(); //store all scripts which has ever been loaded throughout the http session
	private Set<String> jsMissing_ = new HashSet<String>(); // store scripts to be loaded
	private List<String> cssScrn_ = new ArrayList<String>();
	private List<String> cssPrit_ = new ArrayList<String>();

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

	private boolean addToList_(List<String> list, String name) {
		for (String s:list) {
			if (s.equalsIgnoreCase(name)) return false;
		}
		list.add(name);
		return true;
	}
	
	public void addCss(List<String> names) {
	    addCss(names, null);
	}
	
	public void addCss(List<String> names, String media) {
        List<String> l = "print".equalsIgnoreCase(media) ? cssPrit_ : cssScrn_;
	    
        for (String nm: names) {
            addToList_(l, nm);
        }
	}

    public void addCss(String name) {
        addCss(name, null);
    }

	public void addCss(String name, String media) {
	    if (null == name) return;
	    addCss(Arrays.asList(name.split("[,;: ]")), media);
	}

	public void addJsLoaded(String name) {
	    addJsLoaded(Arrays.asList(name.split("[,;: ]")));
	}
	
	public void addJsLoaded(Collection<String> loaded) {
	    for (String name: loaded) {
	        jsGlobalLoaded_.add(name);
	        if(jsLoaded_.add(name)) {
	            jsMissing_.remove(name);
	        }
	    }
	}
	
	public void clearLoaded() {
	    jsLoaded_.clear();
	}

	public void addJsMissings(Collection<String> missings) {
	    if (null == missings) return;
		jsMissing_.addAll(missings);
		jsMissing_.removeAll(jsGlobalLoaded_);
	}
	
	public void addJsMissings(String name) {
	    if (null == name) return;
	    addJsMissings(Arrays.asList(name.split("[,;: ]")));
	}

	public List<String> getJsMissings() {
		List<String> ret = DependencyManager.JS_DEP_MGR.comprehend(jsMissing_, true);
		return ret;
	}

	public List<String> getCssList(String media) {
		List<String> l =  comprehend_(media);
		return l;
	}

	private List<String> comprehend_(String media){
	    return DependencyManager.CSS_DEP_MGR.comprehend("print".equalsIgnoreCase(media) ? cssPrit_ : cssScrn_);
	}
	
	// -- helper functions --
	
	@SuppressWarnings("unchecked")
    public Collection<String> asList(Object o) {
	    if (null == o) return Collections.emptyList();
	    if (o instanceof Collection) {
	        return (Collection<String>)o;
	    }
	    return Arrays.asList(o.toString().split("[,;: ]"));
	}
	
	public String gsDir() {
	    return Minimizor.gsDir();
	}
}
