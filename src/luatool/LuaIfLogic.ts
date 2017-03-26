import { LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from './TokenInfo';
import {LuaParse} from './LuaParse'
export class LuaIfLogic {
    private lp: LuaParse;
    constructor(luaparse: LuaParse) {
        this.lp = luaparse;
    }

    /**
     * 检查if 语句
     * isElseIf 是否检查 elseif 默认为false
     */
    public check(parent: LuaInfo, isIf:boolean, isElseIf: boolean , isElse:boolean,checkBreak:Function): boolean {

        //创建一个luaInfo 标识未 ifLuaInfo
          
            var token: TokenInfo = this.lp.getCurrentToken("代码未完成")
            var luaInfo: LuaInfo = new LuaInfo(token)
            if(this.lp.isError)return
              var returnValue:any = false
            if (this.lp.consume('if', token, TokenTypes.Keyword)) {
               luaInfo.type = LuaInfoType.IF
              luaInfo.name = token.value
              returnValue = this.checkIfAndElseIF(luaInfo,token,checkBreak)
                 
            }
            else if(isElseIf == true && this.lp.consume('elseif', token, TokenTypes.Keyword))
             {
                 luaInfo.type = LuaInfoType.ELSEIF
                 luaInfo.name = token.value
                returnValue = this.checkIfAndElseIF(luaInfo,token,checkBreak)
             }else if(isElse == true && this.lp.consume('else', token, TokenTypes.Keyword))
             {
                  luaInfo.type = LuaInfoType.ELSE
                  luaInfo.name = token.value
                 returnValue = this.checkLuaInfos(luaInfo,false,false,checkBreak);
             }
             else
             {
                return false
             }
             
             if(returnValue == "end")
             {
                this.lp.tokenIndex++;
                 return true
             }else
             {
                 if(returnValue == "elseif") 
                 {
                    var re = this.check(luaInfo,false,true,true,checkBreak)
                    if(this.lp.isError)return false
                    if(re == false) 
                    {

                        this.lp.setError(this.lp.getCurrentToken(null), luaInfo.name  + " 代码未完成")
                        return false
                    }
                   return re 
                 }else if(returnValue == "else")
                 {
                     this.lp.tokenIndex++;
                     var revalue = this.checkLuaInfos(luaInfo,false,false,checkBreak)
                      if(this.lp.isError)return false
                      if(revalue == "end") 
                      {
                         this.lp.tokenIndex++;
                          return true
                      }else
                      {
                          this.lp.setError(this.lp.getCurrentToken(null),luaInfo.name  + " 代码未完成")
                          return false
                      }
                      
                 }else
                 {
                     if(this.lp.isError)return false
                      this.lp.setError(this.lp.getLastToken(), luaInfo.name  + " 代码未完成")
                     return false
                 }

             }


             
    }

    public checkIfAndElseIF(luaInfo:LuaInfo,token:TokenInfo,checkBreak:Function):any
    {
        
               
                this.lp.tokenIndex++;
                this.lp.luaSetValue.check(false,false,null)
                if (this.lp.isError) return false
                var thenToken = this.lp.getNextToken("缺少 then")
                if (this.lp.isError) return false
                if (!this.lp.consume('then', thenToken, TokenTypes.Keyword)) {
                    this.lp.setError(thenToken, "应该为then")
                    if (this.lp.isError) return false
                }
                this.lp.tokenIndex++;
              return this.checkLuaInfos(luaInfo,true,true,checkBreak);
    }

    public checkLuaInfos(LuaInfo:LuaInfo,isCheckElseIf:boolean,ischeckElse:boolean,checkBreak:Function):any
    {
    //      var token: TokenInfo = this.lp.getTokenByIndex(this.lp.tokenIndex, "代码未完成")
    //      if(this.lp.isError)return false
    //     if (this.lp.consume('end', token, TokenTypes.Keyword)) {
    //                     this.lp.tokenIndex++;
    //                     this.lp.checkComma()
    //                     return "end"
    //    }
        var returnValue:any = this.lp.setLuaInfo(LuaInfo, 
        function (luaParse: LuaParse):any {
            
                    var token: TokenInfo = luaParse.getTokenByIndex(luaParse.tokenIndex , "代码未完成")
                    if (luaParse.isError) return false
                    if (luaParse.consume('end', token, TokenTypes.Keyword)) {
                       
                        luaParse.checkSemicolons()
                        return "end"
                    } else if (isCheckElseIf == true && luaParse.consume('elseif', token, TokenTypes.Keyword)) {
                        return "elseif"
                    } else if (ischeckElse == true && luaParse.consume('else', token, TokenTypes.Keyword))
                    {
                        return "else"
                    }
                    return false
                },checkBreak)
       return returnValue        
    }

    

}