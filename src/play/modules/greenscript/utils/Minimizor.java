package play.modules.greenscript.utils;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.Reader;
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
	private static Map<List<String>, String> jsBag_ = new HashMap<List<String>, String>();
	private static Map<List<String>, String> cssBag_ = new HashMap<List<String>, String>();
	private static boolean cache_ = true;
	private static boolean compress_ = true;
	private static String gsDir_ = "/public/gs/";
	
	public static String gsDir() {
	    return gsDir_;
	}
	
	public static void setGsDir(String gsDir) {
	    if (gsDir.endsWith("/"))
	        gsDir_ = gsDir;
	    else
	        gsDir_ = gsDir + "/";
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
	public static void setCompressSetting(boolean compress){
		compress_ = compress;
	}
	
	public static String minimizeJs(String jsNames) {
	    if (null == jsNames) return "";
	    return minimizeJs(Arrays.asList(jsNames.split("[,;: ]")));
	}

	public static String minimizeJs(List<String> jsNames) {
		if (jsNames.size() == 0) return "";
		
		String name = jsBag_.get(jsNames);
		if (null != name) {
			if (cache_) {
				File f = Play.getFile(gsDir_ + name);
				if (f.exists()) {
				    return name;
				} else {
				    // cached file get removed some how
				    jsBag_.remove(jsNames);
				}
			} else {
			    // cache_ setting turned off at runtime
				jsBag_.remove(jsNames);
			}
		}

		File outFile = randomFile(".js");
		String fn = outFile.getName();

		Writer out = null;
		try {
			out = new BufferedWriter(new FileWriter(outFile, true));
			for (String s : jsNames) {
				compressJs_(s, out);
			}
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

		if (cache_) jsBag_.put(jsNames, fn);
		return fn;
	}

	public static String minimizeCss(List<String> cssNames) {
		String name = cssBag_.get(cssNames);
		if (null != name) {
		    if (cache_) {
    			File f = Play.getFile(gsDir_ + name);
    			if (f.exists()) {
    				return name;
    			} else {
    			    // cached file get removed somehow
    			    cssBag_.remove(cssNames);
    			}
		    } else {
		        // cache setting turned off at runtime
		        cssBag_.remove(cssNames);
		    }
		}

		File outFile = randomFile(".css");
		String fn = outFile.getName();

		Writer out = null;
		try {
			out = new BufferedWriter(new FileWriter(outFile, true));
			for (String s : cssNames) {
				compressCss_(s, out);
			}
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

		if (cache_) cssBag_.put(cssNames, fn);
		return fn;
	}

	private static String getJsPath_() {
		return GreenScriptPlugin.getJsDir();
	}

	private static String getCssPath_() {
		return GreenScriptPlugin.getCssDir();
	}

	private static void compressJs_(String fn, Writer out) {
	    try {
    		Logger.debug("minizing... %1$s.js", fn);
    		File inFile = Play.getFile(getJsPath_() + fn + ".js");
    		BufferedReader in = new BufferedReader(new FileReader(inFile));
    		if (compress_) {
    			try {
        			JavaScriptCompressor compressor = new JavaScriptCompressor(in, er_);
    			    compressor.compress(out, -1, true, false, false, false);
    			} catch (Exception e) {
    			    Logger.error("error minimizing javascript file %1$s", fn);
    			    in = new BufferedReader(new FileReader(inFile)); // reopen the file
    			    copyJs_(in, out, fn);
    			}
    		} else {
    		    copyJs_(in, out, fn);
    		}
    	} catch (IOException e) {
    	    Logger.error(e, "error processing javascript file file %1$s", fn);
    	}
	}
	
	private static void copyJs_(BufferedReader in, Writer out, String fn) throws IOException {
		String line = null; 
		PrintWriter writer = new PrintWriter(out);
		while ((line = in.readLine()) != null) {
			writer.println(line);
		}
	}

	private static void compressCss_(String fn, Writer out) {
	    try {
    		Logger.debug("minizing... %1$s.css", fn);
    		File inFile = Play.getFile(getCssPath_() + fn + ".css");
    		Reader in = new BufferedReader(new FileReader(inFile));
    		CssCompressor compressor = new CssCompressor(in);
    		compressor.compress(out, -1);
    	} catch (IOException e) {
    	    Logger.error(e, "error processing css file %1$s", fn);
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

		public void warning(String message, String sourceName, int line,
				String lineSource, int lineOffset) {
			if (line < 0) {
				Logger.warn("[MINIMIZOR.WARNING] " + message);
			} else {
				Logger.warn("[MINIMIZOR.WARNING] %1$s: %2$s: %3$s", line,
						lineOffset, message);
			}
		}

		public void error(String message, String sourceName, int line,
				String lineSource, int lineOffset) {
			if (line < 0) {
				Logger.error("[MINIMIZOR.ERROR] " + message);
			} else {
				Logger.error("[MINIMIZOR.ERROR] %1$s: %2$s: %3$s", line,
						lineOffset, message);
			}
		}

		public EvaluatorException runtimeError(String message,
				String sourceName, int line, String lineSource, int lineOffset) {
			error(message, sourceName, line, lineSource, lineOffset);
			return new EvaluatorException(message);
		}
	};
}
