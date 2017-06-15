import vscode = require('vscode');
import {LuaFiledCompletionInfo} from "../provider/LuaFiledCompletionInfo"
import {CLog,getParamComment,getTokens,getFirstComments} from '../Utils'
import {  LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from '../TokenInfo';
export class LuaSymbolInformation extends vscode.SymbolInformation
{
    public isLocal:boolean = false;
    public argLuaFiledCompleteInfos:Array<LuaFiledCompletionInfo>;
    private uri_:vscode.Uri;
    private range_:vscode.Range;
    public parent:LuaSymbolInformation;
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
                vscode.CompletionItemKind.Variable,this.uri_,this.range_.start,false) 
                if(comments)  {
                for (var index = 0; index < comments.length; index++) {
                    var comment:LuaComment = comments[index];

                    var argComment = "@"+element+":";
                    var cindex:number = comment.content.indexOf(argComment)
                    if(cindex > -1){
                        completion.documentation = comment.content.substring(cindex+argComment.length).trim()
                        break
                    }
                }
                }
                this.argLuaFiledCompleteInfos.push(completion) 
            }
            
        }
        
    }   
}