import vscode = require('vscode');
import {LuaFiledCompletionInfo} from "../provider/LuaFiledCompletionInfo"
import {CLog,getParamComment,getSelfToModuleName,getTokens,getFirstComments} from '../Utils'
import {  LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from '../TokenInfo';
export class LuaSymbolInformation extends vscode.SymbolInformation
{
    public isLocal:boolean = false;
    public argLuaFiledCompleteInfos:Array<LuaFiledCompletionInfo>;
    private uri_:vscode.Uri;
    private range_:vscode.Range;
    constructor(name: string, kind: vscode.SymbolKind, range: vscode.Range, uri?: vscode.Uri, containerName?: string)
    {
        
        super(name,kind,range,uri,containerName);
        this.uri_ = uri;
        this.range_ = range;
    
    }

    public initArgs(args:Array<string>,comments: Array<LuaComment>)
    {
        if(args != null )
        {
            this.argLuaFiledCompleteInfos = new Array<LuaFiledCompletionInfo>();
            for (var i = 0; i < args.length; i++) {
                var element = args[i];
                var completion:LuaFiledCompletionInfo = new LuaFiledCompletionInfo(element, 
                vscode.CompletionItemKind.Variable,this.uri_,this.range_.start)   
                this.argLuaFiledCompleteInfos.push(completion) 
            }
            
        }
        
    }   
}