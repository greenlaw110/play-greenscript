package play.modules.greenscript.utils;

import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

import play.Logger;

import org.apache.commons.configuration.Configuration;

public class DependencyManager {
	public static DependencyManager JS_DEP_MGR = new DependencyManager();
	public static DependencyManager CSS_DEP_MGR = new DependencyManager();
	
	private static void configDependencies_(DependencyManager dm, Configuration conf){
		for (Iterator itr = conf.getKeys(); itr.hasNext();){
			String name = (String)itr.next();
			dm.createDependency(name, new HashSet(conf.getList(name)));
		}
	}
	
	public static void configDependencies(Configuration jsConf, Configuration cssConf) {
		configDependencies_(JS_DEP_MGR, jsConf);
		configDependencies_(CSS_DEP_MGR, cssConf);
	}
	
	public DependencyManager() {
	}
	
	private Map<String, Set<String>> deps_ = new HashMap<String, Set<String>>();
	private Map<String, Integer> weight_ = new HashMap<String, Integer>();
	public void createDependency(String dependant, Set<String> dependOn) {
		deps_.put(dependant, dependOn);
		setWeight_(dependant, dependOn);
		
	}
	private void setWeight_(String dependant, Set<String> dependOn) {
	    if (!weight_.containsKey(dependant)) {
	        Logger.trace(String.format("%1$s weight %2$s", dependant, 1));
	        weight_.put(dependant, 1);
	    }
	    int w = weight_.get(dependant);
	    for (String s: dependOn) {
	        int w2;
	        if (!weight_.containsKey(s)) {
	            w2 = 10;
	        } else {
	            w2 = weight_.get(s) + 10 * w;
	        }
            Logger.trace(String.format("%1$s weight %2$s", s, w2));
            weight_.put(s, w2);
            Set<String> set = deps_.get(s);
            if (set != null)
                setWeight_(s, set);
	    }
	}
	private Set allDepends_(String dependant){
		Set all = new HashSet();
		if (!deps_.containsKey(dependant)) {
			all.add(dependant);
			return all;
		}
		for (String s: deps_.get(dependant)) {
			all.addAll(allDepends_(s));
		}
		all.add(dependant);
		return all;
	}
	private boolean isDependant_(String dependant, String something) {
		Set set = allDepends_(dependant);
		return set.contains(something);
	}
	public List sort(Collection<String> list){
		String[] names = list.toArray(new String[]{});
		Arrays.sort(names, new Comparator<String>() {
			public int compare(String o1, String o2) {
			    int w1 = weight_.containsKey(o1) ? weight_.get(o1) : -1;
			    int w2 = weight_.containsKey(o2) ? weight_.get(o2) : -1;
			    return w2 - w1;
			}
		});
		return Arrays.asList(names);		
	}
	
	public List<String> comprehend(Collection<String> set) {
		Set<String> ret = new HashSet();
		for (String s: set) {
			ret.addAll(allDepends_(s));
		}
		return sort(ret);
	}
}
