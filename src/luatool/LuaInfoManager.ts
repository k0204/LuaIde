import { LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType } from './TokenInfo';
import { LuaParse } from "./LuaParse"
import { CompletionItem, CompletionItemKind, Uri } from "vscode"
import { LuaFiledCompletionInfo } from "./provider/LuaFiledCompletionInfo"
import { FileCompletionItemManager, CompletionItemSimpleInfo } from "./manager/FileCompletionItemManager"
import { CLog,getCurrentFunctionName } from './Utils'
import vscode = require('vscode');
import { LuaFileCompletionItems } from "./manager/LuaFileCompletionItems";

export class FindCompletionInfo {
    public moduleName: string;
    public keys: Array<string>;
}


export class LuaInfoManager {

    public tokens: Array<TokenInfo>;
    public fileCompletionItemManagers: Map<string, FileCompletionItemManager>;

    public lp: LuaParse;


    public currentFcim: FileCompletionItemManager;

    constructor() {

        this.fileCompletionItemManagers = new Map<string, FileCompletionItemManager>();
    }
    private initKeyWrodCompletioins() {
        
    }
    public setFcim(uri: Uri, fcim: FileCompletionItemManager) {
        this.fileCompletionItemManagers.set(uri.path, fcim);
    }
    public getFcim(uri: Uri): FileCompletionItemManager {
        var fcim: FileCompletionItemManager = null;
        if (this.fileCompletionItemManagers.has(uri.path)) {
            fcim = this.fileCompletionItemManagers.get(uri.path)
        }
        return fcim;
    }
    public getFcimByPathStr(path:string):FileCompletionItemManager
    {
         var fcim: FileCompletionItemManager = null;
        if (this.fileCompletionItemManagers.has(path)) {
            fcim = this.fileCompletionItemManagers.get(path)
        }
        return fcim;
    }
    public init(lp: LuaParse, uri: Uri, tempUri: Uri) {
        this.lp = lp;
        this.tokens = lp.tokens;
        this.currentFcim = new FileCompletionItemManager(tempUri);
        this.fileCompletionItemManagers.set(uri.path, this.currentFcim);
       
    }
    public addFunctionCompletionItem(luaInfo: LuaInfo, token: TokenInfo, functionEndToken: TokenInfo) {
        this.currentFcim.addFunctionCompletion(this.lp, luaInfo, token, functionEndToken)
    }
    public addCompletionItem(luaInfo: LuaInfo, token: TokenInfo): LuaFiledCompletionInfo {
        
        var completion = this.currentFcim.addCompletionItem(this.lp,
            luaInfo, token, this.tokens,false,true);
       

        return completion

    }
   
  
    
   



    public addSymbol(luaInfo: LuaInfo, token: TokenInfo, functionEndToken: TokenInfo, symolName: string) {
        this.currentFcim.addSymbol(this.lp, luaInfo, token, functionEndToken, symolName)
    }

   

    public addGlogCompletionItems(items: Array<LuaFiledCompletionInfo>) {
        this.fileCompletionItemManagers.forEach((v, k) => {
            if (k != LuaParse.checkTempFilePath) {
                items.push(v.luaGolbalCompletionInfo)
            }

        })
        this.fileCompletionItemManagers.forEach((v, k) => {
            if (k != LuaParse.checkTempFilePath) {
                items.push(v.luaFunCompletionInfo)
            }

        })
    }

    




    public getFunctionArgs(tokens: Array<TokenInfo>, uri: Uri) {
        var fcim: FileCompletionItemManager = this.getFcimByPathStr(uri.path)
        var funNames: Array<string> = getCurrentFunctionName(tokens)
        if (fcim == null) {
            return [];
        }
        return fcim.getSymbolArgsByNames(funNames)


    }


   
    





}