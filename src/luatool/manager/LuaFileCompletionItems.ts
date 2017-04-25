import vscode = require('vscode');
import { LuaFiledCompletionInfo } from "../provider/LuaFiledCompletionInfo"
import { ExtensionManager } from "../ex/ExtensionManager"
export class LuaFileCompletionItems {
    private static _ins: LuaFileCompletionItems;
    private scriptPaths:Array<string>;
    public static getLuaFileCompletionItems() {
        if (LuaFileCompletionItems._ins == null) {
            LuaFileCompletionItems._ins = new LuaFileCompletionItems()
        }
        return LuaFileCompletionItems._ins;
    }
    public completions: Array<LuaFiledCompletionInfo>;
    public constructor() {
        this.completions = new Array<LuaFiledCompletionInfo>()
        this.scriptPaths = new Array<string>();
        ExtensionManager.em.luaIdeConfigManager.scriptRoots.forEach(scriptRoot=>{
         
           scriptRoot = scriptRoot.replace(/\\/g, "/");
            scriptRoot =  scriptRoot.replace(new RegExp("/", "gm"), ".")
            this.scriptPaths.push(scriptRoot)
        })
    }
    public addCompletion(path: vscode.Uri, isCheck: boolean) {
        if (isCheck) {
            for (var index = 0; index < this.completions.length; index++) {
                var element = this.completions[index];
                if (element.uri.path == path.path) {
                    return
                }
            }
        }
        var position: vscode.Position = new vscode.Position(1, 1)
        var str:string = path.fsPath
        var luaIndex = str.lastIndexOf(".lua")
        if(luaIndex>-1){
            str = str.substring(0,luaIndex)
        }
         str = str.replace(/\\/g, "/");
        str =  str.replace(new RegExp("/", "gm"), ".")
       var  str_1 = str.toLowerCase()
       
        this.scriptPaths.forEach(scriptPath=>{
            var scriptPath_1 =scriptPath.toLowerCase();
            var length =  scriptPath_1.length;
            var index = str_1.indexOf(scriptPath_1)
             if (index > -1) {
                    str = str.substring(index+length)
                    if(str.charAt(0) == "."){
                        str = str.substring(1)
                    }
                    
                    var completion: LuaFiledCompletionInfo = new LuaFiledCompletionInfo(
                        str, vscode.CompletionItemKind.Module, path, position,false)
                        this.completions.push(completion)
                }

        })
       

    }
}
