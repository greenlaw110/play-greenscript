package controllers;

import play.mvc.*;

public class Application extends Controller {

    public static void index() {
        render();
    }
    
    public static void post() {
        flash.success("Information collected");
        render(params);
    }
    
    public static void singlePage() {
        render();
    }

}              
