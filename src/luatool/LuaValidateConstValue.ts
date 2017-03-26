import {LuaInfo, LuaInfoTypeValue,TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from './TokenInfo';
import {LuaParse} from './LuaParse'
/**验证 是否为一个可以复制的 token */
export class LuaValidateConstValue {
    private lp: LuaParse;
  
    constructor(luaparse: LuaParse) {
        this.lp = luaparse;
    }
     /**
   * 验证是否是一个可以符值的token
   */
  public check(token: TokenInfo, luaInfo: LuaInfo): boolean {

    if (token.type == TokenTypes.BooleanLiteral) {
      if(luaInfo.isVar== true) 
      {
        this.lp.setError(token,"变量申明不能为 boolean")
        return
      }
      luaInfo.type = LuaInfoType.BOOLEAN
      luaInfo.valueType = LuaInfoTypeValue.BOOL
      return true
    }
    else if (token.type == TokenTypes.NilLiteral) {
      if(luaInfo.isVar== true) 
      {
        this.lp.setError(token,"变量申明不能为 nil")
        return
      }
      luaInfo.type = LuaInfoType.NIL
       luaInfo.valueType = LuaInfoTypeValue.NIL
      return true
    }
    else if (token.type == TokenTypes.NumericLiteral) {
      if(luaInfo.isVar== true) 
      {
        this.lp.setError(token,"变量申明不能为 number")
        return
      }
      luaInfo.valueType = LuaInfoTypeValue.NUMBER
      luaInfo.type = LuaInfoType.Number
      return true
    }
    else if (token.type == TokenTypes.StringLiteral) {
       if(luaInfo.isVar== true) 
      {
        this.lp.setError(token,"变量申明不能为 string")
        return
      }
      luaInfo.valueType = LuaInfoTypeValue.STRING

       luaInfo.type = LuaInfoType.STRING
      return true
    }
    else if (token.type == TokenTypes.VarargLiteral) {
       if(luaInfo.isVar== true) 
      {
        this.lp.setError(token,"变量申明不能为 ...")
        return
      }
      luaInfo.valueType = LuaInfoTypeValue.ANY
      luaInfo.type = LuaInfoType.Vararg
      return true
    }
    else if(token.type == TokenTypes.Identifier)
    {
      luaInfo.type = LuaInfoType.Field
       luaInfo.valueType = LuaInfoTypeValue.ANY
      return true
    }
    else {
      if(!this.lp.consume('(',token,TokenTypes.Punctuator))
      {
        this.lp.setError(this.lp.getCurrentToken(null),"意外的字符");
          this.lp.tokenIndex--;
          
      }
      return false
    }

  }
}