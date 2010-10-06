package play.modules.greenscript.utils;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.Writer;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.mozilla.javascript.ErrorReporter;
import org.mozilla.javascript.EvaluatorException;

import play.Logger;
import play.Play;
import play.exceptions.UnexpectedException;
import play.modules.greenscript.GreenScriptPlugin;

import com.yahoo.platform.yui.compressor.CssCompressor;
import com.yahoo.platform.yui.compressor.JavaScriptCompressor;

public class Minimizor {
    private static FileCache_ jsBag_ = new FileCache_();
    private static FileCache_ cssBag_ = new FileCache_();
    private static boolean cache_ = true;
    private static boolean compress_ = true;
    private static String gsDir_ = "/public/gs/";

    public static String gsDir() {
        return gsDir_;
    }

    public static void setGsDir(String gsDir) {
        if (!gsDir.endsWith("/"))
            gsDir += "/";
        
        if (gsDir.startsWith("/")) {
            gsDir_ = gsDir;
        } else {
            gsDir_ = "/public/" + gsDir;
        }
    }

    public static boolean getCacheSetting() {
        return cache_;
    }

    public static void setCacheSetting(boolean cache) {
        cache_ = cache;
    }

    public static boolean getCompressSetting() {
        return compress_;
    }

    public static void setCompressSetting(boolean compress) {
        if (compress != compress_) {
            // clear cache
            jsBag_.clear();
            cssBag_.clear();
            compress_ = compress;
        }
    }

    public static String minimizeJs(String jsNames) {
        if (null == jsNames)
            return "";
        return minimizeJs(Arrays.asList(jsNames.split("[,; ]")));
    }

    private static String minimize_(List<String> names, boolean isJs) {
        if (names.size() == 0) return "";
        FileCache_ fc = isJs ? jsBag_ : cssBag_;
        
        if (cache_) {
            String fn = fc.get(names);
            if (null != fn) return fn;
        }
        
        File outFile = randomFile(isJs ? ".js" : ".css");
        
        Writer out = null;
        try {
            out = new BufferedWriter(new FileWriter(outFile, true));
            for (String s: names) compress_(s, out, isJs);
        } catch (IOException e) {
            throw new UnexpectedException(e);
        } finally {
            if (out != null) {
                try {
                    out.close();
                } catch (IOException e) {
                    Logger.warn("cannot close output in minimizor", e);
                }
            }
        }
        
        // filename always cached without regarding to cache setting
        // this is a good time to remove previous file
        // Note it's absolutely not a good idea to turn cache off
        // and minimize on in a production environment
        String fn = outFile.getName();
        fc.put(names, fn);
        return fn;
    }

    public static String minimizeJs(List<String> jsNames) {
        return minimize_(jsNames, true);
    }

    public static String minimizeCss(List<String> cssNames) {
        return minimize_(cssNames, false);
    }
    
    private static String getFullPath_(String fn, boolean isJs) {
        if (isJs && !fn.endsWith(".js")) fn += ".js";
        if (!isJs && !fn.endsWith(".css")) fn += ".css";
        if (fn.startsWith("/")) return fn;
        return isJs ? getJsPath_() + fn : getCssPath_() + fn;
    }

    private static String getJsPath_() {
        return GreenScriptPlugin.getJsDir();
    }

    private static String getCssPath_() {
        return GreenScriptPlugin.getCssDir();
    }

    private static void compress_(String fn, Writer out, boolean isJs) {
        try {
            Logger.trace("minizing... %1$s.%2$s", fn, isJs ? "js" : "css");
            if (fn.startsWith("http")) return; // skip CDN
            fn = getFullPath_(fn, isJs); 
            File inFile = Play.getFile(fn);
            BufferedReader in = new BufferedReader(new FileReader(inFile));
            if (compress_) {
                try {
                    if (isJs) {
                        JavaScriptCompressor compressor = new JavaScriptCompressor(in, er_);
                        compressor.compress(out, -1, true, false, false, false);
                    } else {
                        CssCompressor compressor = new CssCompressor(in);
                        compressor.compress(out, -1);
                    }
                } catch (Exception e) {
                    Logger.error("error minimizing %2$s file %1$s", fn, isJs ? "javascript" : "stylesheet");
                    in = new BufferedReader(new FileReader(inFile)); // reopen the file
                    copy_(in, out, fn);
                }
            } else {
                copy_(in, out, fn);
            }
        } catch (IOException e) {
            Logger.error(e, "error processing javascript file file %1$s", fn);
        }
    }

    private static void copy_(BufferedReader in, Writer out, String fn) throws IOException {
        String line = null;
        PrintWriter writer = new PrintWriter(out);
        while ((line = in.readLine()) != null) {
            writer.println(line);
        }
    }

    private static File tmpDir() {
        File gsDir = Play.getFile(gsDir_);
        if (!gsDir.exists()) {
            gsDir.mkdir();
        }
        return gsDir;
    }

    private static File randomFile(String suffix) {
        try {
            return File.createTempFile("gstmp", suffix, tmpDir());
        } catch (IOException e) {
            String msg = "Error create temp file for minimizor";
            throw new UnexpectedException(msg, e);
        }
    }

    private static ErrorReporter er_ = new ErrorReporter() {

        public void warning(String message, String sourceName, int line, String lineSource, int lineOffset) {
            if (line < 0) {
                Logger.warn("[MINIMIZOR.WARNING] " + message);
            } else {
                Logger.warn("[MINIMIZOR.WARNING] %1$s: %2$s: %3$s", line, lineOffset, message);
            }
        }

        public void error(String message, String sourceName, int line, String lineSource, int lineOffset) {
            if (line < 0) {
                Logger.error("[MINIMIZOR.ERROR] " + message);
            } else {
                Logger.error("[MINIMIZOR.ERROR] %1$s: %2$s: %3$s", line, lineOffset, message);
            }
        }

        public EvaluatorException runtimeError(String message, String sourceName, int line,
                String lineSource, int lineOffset) {
            error(message, sourceName, line, lineSource, lineOffset);
            return new EvaluatorException(message);
        }
    };
    
    /**
     * Works like a normal map<key, fileName> but with logic that remove cached file from
     * the file system when calling .remove(key) method. 
     *  
     * @author greenl
     */
    private static class FileCache_ {
        Map<List<String>, String> m_ = new HashMap<List<String>, String>();
        
        private File f_(String fn) {
            return Play.getFile(gsDir_ + fn);
        }
        
        /**
         * Return cached filename. This method guarantees that
         * file always exists if a non-null value returned 
         * 
         * @param key
         * @return filename by key if file exists, null otherwise
         */
        public String get(List<String> key) {
            String fn = m_.get(key);
            if (null == fn) return null;
            if (!f_(fn).exists()) {
                m_.remove(key);
                return null;
            }
            return fn;
        }
        
        public String put(List<String> key, String fileName) {
            String old = remove(key);
            m_.put(key, fileName);
            return old;
        }
        
        public String remove(List<String> key) {
            String fn = m_.remove(key);
            if (null == fn) return null;
            delFile_(fn);
            return fn;
        }
        
        /**
         * Clear cache and corresponding files
         */
        public void clear() {
            for (String fn: m_.values()) {
                delFile_(fn);
            }
            m_.clear();
        }
        
        private void delFile_(String fn) {
            File f = f_(fn);
            if (f.exists()) {
                if (!f.delete()) f.deleteOnExit();
            }
        }
    }

}
