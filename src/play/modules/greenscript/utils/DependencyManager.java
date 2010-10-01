package play.modules.greenscript.utils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.SortedSet;
import java.util.TreeSet;

import org.apache.commons.configuration.Configuration;

public class DependencyManager {
    public static DependencyManager JS_DEP_MGR = new DependencyManager();
    public static DependencyManager CSS_DEP_MGR = new DependencyManager();

    private static class Node implements Comparable<Node> {
        String name;
        Map<String, Node> ups;
        // Map<String, Node> repo;
        int weight = 1;
        static final int STEP = 100;

        Node(String name /* , Map<String, Node> repo */) {
            this.name = name;
            ups = new HashMap<String, Node>();
            // this.repo = repo;
        }

        void refreshUpWeights() {
            increaseWeightOn(null);
        }

        void increaseWeightOn(Node node) {
            if (null != node)
                this.weight += node.weight + STEP;
            for (Node up : ups.values()) {
                up.increaseWeightOn(this);
            }
        }

        void addUp(Node up) {
            ups.put(up.name, up);
        }

        /*
         * HashMap<String, Node> findAllDowns() { HashMap<String, Node> downs =
         * new HashMap(); for (Node node: repo.values()) { if
         * (node.ups.containsKey(this.name)) { downs.put(node.name, node); } }
         * return downs; }
         */
        static Node createNode(String name, Set<String> dependsOns, Map<String, Node> repo) {
            if (null == name)
                throw new NullPointerException();
            Node node = repo.get(name);
            if (null == node)
                node = new Node(name/* , repo */);

            for (String s : dependsOns) {
                Node up = Node.createNode(s, new HashSet<String>(), repo);
                node.addUp(up);
            }

            repo.put(name, node);

            return node;
        }

        public boolean equals(Object that) {
            if (that == null)
                return false;
            if (that == this)
                return true;
            if (!(that instanceof Node))
                return false;
            return name.equals(((Node) that).name);
        }

        public int hashCode() {
            return name.hashCode();
        }

        public String toString() {
            return name;
        }

        @Override
        public int compareTo(Node o) {
            if (null == o) return -1;
            if (equals(o)) return 0;
            if (this.weight == o.weight)
                return o.name.compareTo(this.name);
            else
                return (o.weight - this.weight);
        }
    }

    @SuppressWarnings("unchecked")
    private static void configDependencies_(DependencyManager dm, Configuration conf) {
        dm.clearCache_();
        for (Iterator<?> itr = conf.getKeys(); itr.hasNext();) {
            String name = (String) itr.next();
            dm.createDependency(name, new HashSet<String>(conf.getList(name)));
        }
        dm.refresh();
    }

    public static void configDependencies(Configuration jsConf, Configuration cssConf) {
        configDependencies_(JS_DEP_MGR, jsConf);
        configDependencies_(CSS_DEP_MGR, cssConf);
    }

    public DependencyManager() {
    }

    private Map<String, Node> deps_ = new HashMap<String, Node>();

    public void createDependency(String dependant, Set<String> dependOns) {
        Node.createNode(dependant, dependOns, deps_);
    }

    private void clearCache_() {
        deps_.clear();
    }

    /**
     * Regulate the order of the repository this should be called after all
     * configuration has been loaded
     */
    public void refresh() {
        for (Node node : deps_.values()) {
            refreshUp_(node);
            calcWeight_(node);
        }
    }

    private void refreshUp_(Node node) {
        for (Node up : new HashSet<Node>(node.ups.values())) {
            refreshUp_(up);
        }
        for (Node up : new HashSet<Node>(node.ups.values())) {
            node.ups.putAll(up.ups);
        }
    }

    private void calcWeight_(Node node) {
        node.refreshUpWeights();
    }

    private Set<Node> allDepends_(String dependant) {
        Set<Node> all = new HashSet<Node>();
        Node node = deps_.get(dependant);
        if (null == node)
            return all;
        all.addAll(node.ups.values());
        all.add(node);
        return all;
    }
    
    public List<String> comprehend(String listAsStr) {
        return comprehend(listAsStr, false);
    }
    
    public List<String> comprehend(String listAsStr, boolean withDefaults) {
        if (null == listAsStr) listAsStr = "";
        return comprehend(Arrays.asList(listAsStr.split("[,; ]")), withDefaults);
    }

    public List<String> comprehend(Collection<String> set) {
        return comprehend(set, false);
    }

    public List<String> comprehend(Collection<String> set, boolean withDefaults) {
        if (null == set) set = Collections.emptySet();
        List<String> ret = new ArrayList<String>();
        SortedSet<Node> nodes = new TreeSet<Node>();
        for (String s : set) {
            nodes.addAll(allDepends_(s));
        }
        if (withDefaults) {
            nodes.addAll(allDepends_("default"));
        }
        for (Node n : nodes) {
            ret.add(n.name);
        }
        /*
         * add the orginal collection again in case some element in the original
         * collection has not been defined in the dependency list
         */
        for (String s : set) {
            if (!ret.contains(s))
                ret.add(s);
        }

        /*
         * DEBUG
         * Logger.info(" ----------------- DEBUG comprehend -----------------");
         * for (String s: ret) { Node n = deps_.get(s); if (null != n) {
         * Logger.info("%1$s, %2$s", n.name, n.weight); } else {
         * Logger.info("%1$s, %2$s", s, -1); } }
         * Logger.info(" ---------------EOF DEBUG comprehend -----------------"
         * );
         */

        ret.remove("default");

        return ret;
    }

    /**
     * Return default (must loaded) list
     */
    public List<String> getDefaultList() {
        Set<Node> defSet = allDepends_("default");
        List<String> ret = new ArrayList<String>();
        for (Node n : defSet)
            ret.add(n.name);
        ret.remove("default");
        return comprehend(ret);
    }
}
