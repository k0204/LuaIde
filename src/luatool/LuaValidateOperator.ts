import {LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from './TokenInfo';
import {LuaParse} from './LuaParse'
/**验证 二元运算符号 */
export class LuaValidateOperator {
  private lp: LuaParse;

  constructor(luaparse: LuaParse) {
    this.lp = luaparse;
  }

  /**
 * 判断一个token 是否是一个运算符号 二元
 */
  public check(token: TokenInfo): boolean {
    if (token.type === TokenTypes.Punctuator || token.type == TokenTypes.Keyword) {
      var value = token.value;
      if (
        value == '+' ||
        value == '-' ||
        value == '*' ||
        value == '/' ||
        value == '>' ||
        value == '<' ||
        value == '>=' ||
        value == '<=' ||
        value == '%' ||
        value == '&' ||
        value == '~' ||
        value == '|' ||
        value == '<<' ||
        value == '>>' ||
        value == '^') {
        return true
      }
      else if (value == '..') {
        return true
      }
      else if (
        value == '==' ||
        value == '~=' ||
        value == 'and' ||
        value == 'or'
      ) {
        return true
      } else return false
    } else return false
  }


}