import { LuaFiledCompletionInfo } from "../provider/LuaFiledCompletionInfo";
import { CompletionItemKind } from "vscode";

export class LuaGolbalCompletionManager {
    public static rootCompletion: LuaFiledCompletionInfo = new LuaFiledCompletionInfo("", CompletionItemKind.Field, null, null, false);
    public static setGolbalCompletion(completion: LuaFiledCompletionInfo) {
        completion.getItems().forEach((v, k) => {
            this.rootCompletion.addItemToGolbal(v)
        })
        // console.log(this.rootCompletion.items)
    }
    public static clearGolbalCompletion(completion: LuaFiledCompletionInfo) {
        completion.getItems().forEach((v, k) => {
            this.rootCompletion.delItemToGolbal(v)
        })
    }

    public static getCompletionByKeys(keys:Array<string>)
    {
        var item = this.rootCompletion;
        for (var index = 0; index < keys.length; index++) {
            var key = keys[index];
            item = item.getItemByKey(key,true)
            if(item == null){
                break;
            }
            index++;
        }
        return item;
       
    }

}