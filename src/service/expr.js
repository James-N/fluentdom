import { Expr, ConstExpr, RefExpr, DynExpr } from '../model/Expr';
import utility from './utility';


/**
 * create Expr from value, if value itself is an Expr, it will be copied
 *
 * @param {any} value
 * @returns {Expr}
 */
export function value2Expr (value) {
    if (value instanceof Expr) {
        if (value instanceof ConstExpr) {
            return new ConstExpr(value.value());
        } else if (value instanceof RefExpr) {
            return new RefExpr(value);
        } else if (value instanceof DynExpr) {
            return new DynExpr(value.$getter);
        } else {
            throw new Error("unsupported expression type");
        }
    } else if (utility.isFunc(value)) {
        return new DynExpr(value);
    } else {
        return new ConstExpr(value);
    }
}