package play.modules.greenscript.utils;

import play.modules.greenscript.GreenScriptPlugin;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.Reader;
import java.io.Writer;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.mozilla.javascript.ErrorReporter;
import org.mozilla.javascript.EvaluatorException;

import play.Logger;
import play.Play;
import play.Play.Mode;
import play.exceptions.UnexpectedException;

import com.yahoo.platform.yui.compressor.CssCompressor;
import com.yahoo.platform.yui.compressor.JavaScriptCompressor;

public class Minimizor {
	private static Map<List<String>, String> jsBag_ = new HashMap();
	private static Map<List<String>, String> cssBag_ = new HashMap();
	private static boolean noCache_ = false;
	private static boolean compress_ = true;
	
	public static void setNoCache(boolean noCache) {
		noCache_ = noCache;
	}
	
	public static void setCompress(boolean compress){
		compress_ = compress;
	}

	public static String minimizeJs(List<String> jsNames) {
		if (jsNames.size() == 0) return "";
		
		String name = jsBag_.get(jsNames);
		if (null != name) {
			if (Play.mode == Mode.DEV) {
				File f = Play.getFile("/public/gs/" + name);
				if (!noCache_ && f.exists()) {
					return name;
				}
			} else {
				return name;
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

		jsBag_.put(jsNames, fn);
		return fn;
	}

	public static String minimizeCss(List<String> cssNames) {
		String name = cssBag_.get(cssNames);
		if (null != name) {
			if (Play.mode == Mode.DEV) {
				File f = Play.getFile("/public/gs/" + name);
				if (!noCache_ && f.exists()) {
					return name;
				}
			} else {
				return name;
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

		cssBag_.put(cssNames, fn);
		return fn;
	}

	private static String jsPath_ = null;
	private static String cssPath_ = null;

	private static String getJsPath_() {
		if (null == jsPath_) {
			jsPath_ = "/public/" + GreenScriptPlugin.getJsDir() + "/";
		}
		return jsPath_;
	}

	private static String getCssPath_() {
		if (null == cssPath_) {
			cssPath_ = "/public/" + GreenScriptPlugin.getCssDir() + "/";
		}
		return cssPath_;
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
		File gsDir = Play.getFile("public/gs");
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
