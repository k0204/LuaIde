import { LuaInfo, TokenInfo, TokenTypes, LuaComment,
    LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from './TokenInfo';
import {LuaParse} from './LuaParse'
import {CLog} from './Utils'
/**验证 一元 */
export class LuaCheckUnary {

    private lp: LuaParse;

    constructor(luaparse: LuaParse) {
        this.lp = luaparse;
    }
    /**
  * 判断是否是一元表达式
  */
    public check(luaInfo: LuaInfo) {
        while (true) {
            CLog();
            var token: TokenInfo = this.lp.getCurrentToken( null)
            if (token != null) {
                if (this.lp.consume('#', token, TokenTypes.Punctuator) ||
                    this.lp.consume('not', token, TokenTypes.Keyword) ||
                    this.lp.consume('-', token, TokenTypes.Punctuator)) {
                    this.lp.tokenIndex++;
                    luaInfo.unarys.push(token)
                } else
                { return }
            } else
                return

        }

    }
}