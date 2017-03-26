import { LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from './TokenInfo';
import {LuaParse} from './LuaParse'
import {CLog} from './Utils'
export class LuaWhileLogic {
    private lp: LuaParse;
    constructor(luaparse: LuaParse) {
        this.lp = luaparse;
    }

    /**
     * 检查if 语句
     */
    public check(parent: LuaInfo): boolean {
         var token: TokenInfo = this.lp.getCurrentToken("代码未完成")
        if (this.lp.consume('while', token, TokenTypes.Keyword)) {
            this.lp.tokenIndex++;
            var luaInfo:LuaInfo = new LuaInfo(token)
            luaInfo.type = LuaInfoType.WHILE
            //先判断表达式  再判断 do
            this.lp.luaSetValue.check(true,false,null)
            if(this.lp.isError)return false
             var doToken:TokenInfo = this.lp.getNextToken("代码未完成")
             if(this.lp.isError)return false
             if(this.lp.consume('do',doToken,TokenTypes.Keyword))
             {
                  this.lp.tokenIndex++;
                 var isEnd:boolean = this.lp.setLuaInfo(luaInfo,function(luaParse:LuaParse)
                    {
                        var token:TokenInfo = luaParse.getTokenByIndex(luaParse.tokenIndex,"代码未完成")
                        if(luaParse.isError)return false
                        if(luaParse.consume('end',token,TokenTypes.Keyword))
                        {
                            luaParse.tokenIndex++;
                            luaParse.checkSemicolons()
                            return true
                        }
                        return false
                    },this.lp.luaForLogic.checkBrreak)
                 if(this.lp.isError)return false
                 if(isEnd) 
                 {
                     return true
                 }else
                 {
                     this.lp.setError(this.lp.getLastToken(),"while 没有 结束  缺少 end")
                     return false
                 }
                 
                  
        
             }else
             {
                 this.lp.setError(doToken,"应该为 do ")
                 return false
             }

        }else
        return  false
        
    }
}