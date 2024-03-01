function log(str: any): void {
    console.log(str);
}
function error(err: string): void {
    console.error("\x1b[31m%s\x1b[0m", err);
}
function debug(): void {
    if (debugFlag && T.length != 0) {
        log('\n');
        log('- - U - - ');
        output(U);

        log('- - T - - ');
        output(T);
    }
}

class constructor {
    name: string;
    fieldsNum: number;
}

class variable {
    name: string;
    count: number;
    terms: term[] = [];
    M: multEq;
}

class multEq {
    vars: variable[] = [];
    terms: multiTerm;
    count: number = 0;
}

class tempMultEq {
    vars: term[] = [];
    terms: multiTerm;
}

class multiTerm {
    constr?: constructor;
    args: tempMultEq[] = [];
}

class term {
    isVar: boolean;
    var?: variable;
    constr: constructor;
    subterms: term[] = [];
    M: term[] = [];
    S: variable[] = [];
}

let fs = require('fs');
var stdin = process.openStdin();
let str, err, path = 'tests/test1.txt';
let constructors, vars: Map<string, variable>;
let U: multEq[] = [];
let T: multEq[] = [];
let zeroCount: multEq[] = [];
let multEqNum = 0;
let debugFlag = false;
let pos = 0; //позиция чтения символа в терме

log("Введите название файла с тестом:");
/*unification();
log('\n______result_______\n');
output(T);*/

stdin.on("data", function (input) {
    input = input.toString().trim();
    if (input == 'exit') {
        stdin.removeAllListeners();
        console.log("Нажмите Enter");
        return;
    }
    if (input == 'debug') {
        debugFlag = !debugFlag;
    } else {
        path = 'tests/' + input + '.txt';
        unification();

        log('\n______result_______\n');
        output(T);
    }
});

function unification(): void {
    err = '';
    constructors = new Map<(string), constructor>([]);
    vars = new Map<(string), variable>([]);
    U = [];
    T = [];
    zeroCount = [];
    multEqNum = 0;
    vars['x0'] = { name: "x0", count: 0 };

    try { str = fs.readFileSync(path, 'utf8'); }
    catch (e) {
        err = e;
        return;
    }

    log(str);

    if (!str.match('First term:') || !str.match('Second term:')) {
        err = 'syntax error';
        return;
    }
    str = str.split(/\s+/).join('');
    let s = str.match(/constructors=(?:.+)variables=(?:.+)Firstterm:(?:.+)Secondterm:(?:.+)/g);//?<term>?<num>
    if (!s) {
        err = 'syntax error';
        return;
    }
    if (s[0] != str) {
        err = 'syntax error';
        return;
    }

    let substr = str.match(/constructors=(.+)variables/);
    parseConstructors(substr[1]);
    if (err) return;

    substr = str.match(/variables=(.+)Firstterm/);
    parseVariables(substr[1]);
    if (err) return;

    substr = str.match(/Firstterm:(.+)Secondterm/);
    let first = parseTerm(substr[1]);
    if (err) return;

    substr = str.match(/Secondterm:(.+)/);
    let second = parseTerm(substr[1]);
    if (err) return;
    vars['x0'].terms = [first, second];

    buildU();
    if (err) return;

    buildZeroCount();
    while (multEqNum > 0) {
        debug();
        let curU = selectMultEq();
        if (err) return;

        let F: tempMultEq[] = [];
        let C: term[];
        let M: multiTerm = curU.terms;
        if (M.args.length > 0) {
            F = [];
            reduce(M, F);
            compact(F);
        }
        T.push(curU);
    }
}

function selectMultEq(): any {
    if (zeroCount.length == 0) {
        err = 'unification error: cycle (1)';
        return;
    }
    multEqNum--;
    return zeroCount.pop();
}

function compact(F: tempMultEq[]): void {
    let vars2: term[] = [], V: term, m: multEq, m1: multEq;
    for (let i = 0; i < F.length; i++) {
        vars2 = F[i].vars;
        V = vars2[0];
        m = V.var!.M;
        m.count--;
        for (let j = 1; j < vars2.length; j++) {
            m1 = vars2[j].var!.M;
            m1.count--;
            m = MergeMultEq(m, m1);
        }
        m.terms = MergeMultiTerms(m.terms, F[i].terms);
        if (m.count == 0) {
            zeroCount.push(m);
        }
    }
    F = [];
}

function findVar(v: variable, vars2: variable[]): boolean {
    let b = false;
    vars2.forEach(el => {
        if (el.name == v.name) b = true;
    });
    return b;
}

function MergeMultEq(m: multEq, m1: multEq): multEq {
    let vars2: variable[] = [], multt: multEq;
    if (m != m1) {
        if (m.vars.length < m1.vars.length) {
            multt = m;
            m = m1;
            m1 = multt;
        }
        m.count += m1.count;
        vars2 = m1.vars;
        for (let i = 0; i < vars2.length; i++) {
            vars2[i].M = m;
                m.vars.push(vars2[i]);
        }
        m.terms = MergeMultiTerms(m.terms, m1.terms);
        multEqNum--;
    }
    return m;
}

function MergeMultiTerms(m: multiTerm, m1: multiTerm): multiTerm {
    let arg: tempMultEq[] = [], arg1: tempMultEq[] = [];
    if (!m.constr && m.args.length == 0) {
        return m1;
    }
    else if (m1.args.length > 0 || m1.constr) {
        if (m.constr! != m1.constr!) {
            err = 'clash';//'unification error: конструкторы имеют разные имена' +' '+ m.constr!.name +' ' + m1.constr!.name;
            return m1;
        } else {
            arg = m.args;
            arg1 = m1.args;
            for (let i = 0; i < arg.length; i++) {
                arg1[i].vars.forEach(v => {
                    arg[i].vars.push(v);
                });

                MergeMultiTerms(arg[i].terms!, arg1[i].terms!);
            }
            m.args = arg;
        }
    }
    return m;
}

function buildMultiTerm(M: term[]): multiTerm {
    let vars2: term[] = [], terms2: term[] = [];
    let list: tempMultEq[] = [];
    if (M.length == 0) {
        return { args: list };
    }
    let constr = M[0].constr;
    if (constr.fieldsNum != 0) {
        let n = M[0].subterms.length;
        for (let i = 0; i < n; i++) {
            let F2: term[] = [];
            let C2: term[] = [];
            M.forEach(elem => {
                if (elem.constr != constr) {
                    err = 'unification error: невозможно построить мультитерм конструкторы имеют разные имена';
                    return;
                }
                let subterm = elem.subterms[i];
                if (subterm.isVar) vars2.push(elem.subterms[i]);
                else terms2.push(elem.subterms[i]);
            }); //еле врубилась что такое мультитерм

            let MT = buildMultiTerm(terms2);
            if (err) return MT;
            list.push({ vars: vars2, terms: MT });
            vars2 = []; terms2 = [];
        }
    }
    let M2: multiTerm = { args: list, constr: constr };
    return M2;
}

function reduce(M: multiTerm, F: tempMultEq[]): void {
    for (let i = 0; i < M.args.length; i++) {
        let arg = M.args[i];
        if (arg.vars.length == 0) {
            reduce(M.args[i].terms!, F);
        }
        else {
            F.push(M.args[i]);
            M.args[i] = { vars: [arg.vars[0]], terms: { args: [] } };
        }
    }
    return;
}

function buildU(): void {

    let i = 0;
    let V = Object.values(vars);
    for (let j = 0; j < V.length; j++) {
        if (V[j].count != 0 || V[j].name == 'x0') {
            let M = buildMultiTerm(V[j].terms);

            if (err) return;
            U.push({ vars: [V[j]], terms: M, count: V[j].count });
            V[j].M = U[i++];
        }

    }
    multEqNum = i;
}

function buildZeroCount(): void {
    U.forEach(u => {
        if (u.count == 0) {// && u.terms.length > 1) { 
            zeroCount.push(u);
        }
    });
}

function parseConstructors(str: string): void {
    let s = str.match(/(?:[A-Za-z]\(\d+\),)*[A-Za-z]\(\d+\)/g);//?<term>?<num>
    if (!s) {
        err = 'constructors syntax error';
        return;
    }
    if (s[0] != str) {
        err = 'constructors syntax error';
        return;
    }
    let constructorsStr = str.split(',');
    constructorsStr.forEach(elem => {
        let res = elem.match(/([A-Za-z])\((\d+)\)/);
        if (constructors[res![1]]) {
            if (constructors[res![1]].fieldsNum.toString() != res![2]) {
                err = 'constructors error: конструкторы с одним именем, но разным количеством переменных';
                return;
            }
        } else
            constructors[res![1]] = { name: res![1], fieldsNum: Number(res![2]) };
    });
    if (err) return;
}

function parseVariables(str: string): void {
    let s = str.match(/(?:[A-Za-z]\,)*[A-Za-z]/g);//?<term>?<num>
    if (!s) {
        err = 'variables syntax error';
        return;
    }
    if (s[0] != str) {
        err = 'variables syntax error';
        return;
    }
    let varStr = str.split(',');
    varStr.forEach(elem => {
        if (constructors[elem]) {
            err = 'variables syntax error: пространство имен конструкторов и переменных пересекаются';
            return;
        }
        vars[elem] = { name: elem, count: 0, terms: [] };
    });
}

function parseTerm(str: string): any {
    pos = 0;
    let term = parseTermStr(str);
    if (str.length != pos) {
        err = 'term syntax error';
        return {};
    }
    return term;
}

function parseTermStr(str: string): any {
    if (!str) {
        err = 'term syntax error';
        return {};
    }
    let t = str[pos++];
    if (vars[t]) {
        vars[t].count++;
        return { isVar: true, var: vars[t] };
    }
    else if (constructors[t]) {
        let constr = constructors[t];
        let n = constr.fieldsNum;
        if (n == 0)
            return { isVar: false, constr: constr };
        else
            try { //на случай, если строка меньше ожидаемой длины
                if (str[pos++] == '(') {
                    let subterms: term[] = [];
                    let subtermsS: variable[] = [];
                    let subtermsM: term[] = [];
                    for (let i = 0; i < n; i++) {
                        if (i != 0 && str[pos++] != ',') {
                            err = 'term syntax error';
                            return {};
                        }
                        let subterm = parseTermStr(str);
                        subterms.push(subterm);
                        if (subterm.isVar) subtermsS.push(subterm);
                        else subtermsM.push(subterm);
                    }
                    if (str[pos++] != ')') {
                        err = 'term syntax error';
                        return {};
                    }
                    return { isVar: false, constr: constr, subterms: subterms, S: subtermsS, M: subtermsM };
                }
            }
            catch (e) {
                err = 'term syntax error';
                return {};
            }
    } else {
        if (t.search(/[A-Za-z]/)) err = 'term syntax error: вхождение в терм необъявленных переменных';
        else err = 'term syntax error';
        return {};
    }
    return {};
}

function output(R: multEq[]): void {
    if (err) {
        error(err);
        return;
    }
    //log(R);
    let out = "";
    R.forEach(ME => {
        let varss = ME.vars;
        out += '{';
        for (let i = 0; i < varss.length; i++) {
            if (i)
                out += ',';
            out += varss[i].name;
        }
        out += '} := ';
        out += termOutput(ME.terms);
        out += '\n'
    });
    log(out);
}

function termOutput(t: multiTerm): string {
    let out = '';
    if (t.args.length == 0 && !t.constr) out += "{}";
    else {
        out += t.constr!.name;
        for (let i = 0; i < t.args.length; i++) {
            if (i)
                out += ',';
            else out += '(';
            let t1 = t.args[i];
            if (t1.vars.length > 0) out += t1.vars[0].var!.name;
            else out += termOutput(t1.terms);
            if (i == t.args.length - 1) out += ')';
        }
    }
    return out;
}