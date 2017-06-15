import { LuaFiledCompletionInfo } from "../provider/LuaFiledCompletionInfo"
import vscode = require('vscode');
import { LuaParse } from "../LuaParse";
import { FileCompletionItemManager } from "../manager/FileCompletionItemManager";
import { LuaGolbalCompletionManager } from "../manager/LuaGolbalCompletionManager";
import { LuaFileCompletionItems } from "../manager/LuaFileCompletionItems";
import { CompletionItemKind } from "vscode";
import { LuaInfoManager } from "../LuaInfoManager";
export class LuaCompletionItemGolbalControler {
     private static _LuaCompletionItemGolbalControler: LuaCompletionItemGolbalControler;
     private luaInfoManager: LuaInfoManager;
    constructor() {
        this.luaInfoManager = LuaParse.lp.luaInfoManager
    }
    public static getIns() {
        if (LuaCompletionItemGolbalControler._LuaCompletionItemGolbalControler == null) {
           LuaCompletionItemGolbalControler._LuaCompletionItemGolbalControler = new LuaCompletionItemGolbalControler()
        }
        return LuaCompletionItemGolbalControler._LuaCompletionItemGolbalControler
    }

    public getItemByKeys(keys:Array<string>){
        var items = this.getFirstItem(keys[0])
        for (var index = 2; index < keys.length; index++) {
            var key = keys[index];
            items = this.getFindItemByKey(items,key);
            if(items.length == 0){
                break;
            }
            index++;
        }
        return items
    }
    public getFindItemByKey(items:Array<LuaFiledCompletionInfo>,key:string){
        var newitems:Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
        for (var index = 0; index < items.length; index++) {
            var item = items[index];
            var fitem =item.getItemByKey(key)
            if(fitem){
                newitems.push(fitem)
            }
        }
        return newitems
    }
    public getFirstItem(key){
        var items:Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
        this.luaInfoManager.fileCompletionItemManagers.forEach((v,k)=>{
             var item = v.luaGolbalCompletionInfo.getItemByKey(key)
             if(item){
                 items.push(item)
             }
        })
        return items;
    }

    
}