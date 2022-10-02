function log(str: any): void {
    console.log(str);
}
function error(err: string): void {
    console.error("\x1b[31m%s\x1b[0m", err);
}
function debug(): void {
    if (debugFlag) console.log(U);
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
    terms: term[] = [];
}

class multiTerm {
    constr: constructor;
    args: tempMultEq[] = [];
    /*vars: variable[] = [];
    terms: term[] = [];*/
    //list: tempMultEq[]
}

class term {
    isVar: boolean;
    var?: variable;
    constr: constructor;
    subterms: term[] = [];
    M: term[] = [];
    S: variable[] = [];
    /*findVarInTerm(v: string): boolean {
        this.subterms?.forEach(elem => {
            if (elem.isVar)
                if (elem.var?.name == v) return true;
        });
        return false;
    }*/
}

let fs = require('fs');
var stdin = process.openStdin();
let str, err, path = 'tests/test1.txt';
let constructors, vars: Map<string, variable>;
let U: multEq[] = [];
let T: multEq[] = [];
let debugFlag = true;
let pos = 0; //позиция чтения символа в терме

unification();
if (err) error(err);

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
        if (err) error(err);
    }
});

function unification(): void {
    err = '';
    constructors = new Map<(string), constructor>([]);
    vars = new Map<(string), variable>([]);
    U = [];
    T = [];
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
    pos = 0;
    let first = parseTerm(substr[1]);
    if (err) return;
    console.log(first);

    substr = str.match(/Secondterm:(.+)/);
    pos = 0;
    let second = parseTerm(substr[1]);
    if (err) return;
    console.log(second);

    /*if (first.constr.name != second.constr.name) {
        err = 'error: имена 1го и 2го терма не совпадают';
        return;
    };*/
    vars['x0'].terms = [first, second];

    buildU();
    if (err) return;

    let curU: multEq = findS();
    if (!curU) {
        err = 'unification error: cycle (1)'
        return;
    }
    let F: tempMultEq[] = [];
    let C: term[];
    let M: multiTerm = curU.terms;
    if (M.args.length > 1) {
        F = [];
        reduce(M, F);
        console.log("\n\n\n M:", M.args[0].vars, M.args[0].terms, M.args[1].vars, M.args[1].terms,
            "\n\n\ F:", F[0].vars, F[0].terms, F[1].vars, F[1].terms);
        compact(F);
    }
    debug();
}

function compact(F: tempMultEq[]): void {
    let vars2: variable[] = [], v: variable, mult: multEq, mult1: multEq;
}

function MergeMultEq(m: multEq, m1: multEq): void {
    let vars2: variable[] = [], multt: multEq;
    if (m != m1) {
        if (m.vars.length < m1.vars.length) {
            multt = m;
            m = m1;
            m1 = multt;
        }
        m.count += m1.count;
        vars2 = m1.vars;
        vars2.forEach(v => {
            //v.terms = m.terms; // или v.M = m; ??
            v.M = m;
            m.vars.forEach(v => {
                m.vars.splice(m.vars.length, 0, v);
            });
        });
        MergeMultiTerms(m.terms, m1.terms)
    }
}

function MergeMultiTerms(m: multiTerm, m1: multiTerm): void {
    let arg: tempMultEq[] = [], arg1: tempMultEq[] = [];
    if (m.args.length == 0) m = m1;
    else if (m1.args.length > 0) {

    }
}

function buildMultiTerm(M: term[]): multiTerm {
    let vars2: term[] = [], terms2: term[] = [];
    let n = M[0].subterms.length;
    let constr = M[0].constr;
    let list: tempMultEq[] = [];
    for (let i = 0; i < n; i++) {
        let F2: term[] = [];
        let C2: term[] = [];
        M.forEach(elem => {
            if (elem.isVar) log('Аня где то облажалась');
            else {
                if (elem.constr != constr) {
                    err = 'unification error: невозможно построить мультитерм конструкторы имеют разные имена';
                    return;
                }
                let subterm = elem.subterms[i];
                if (subterm.isVar) vars2.push(elem.subterms[i]);
                else terms2.push(elem.subterms[i]);
            }
        }); //еле врубилась что такое мультитерм
        list.push({ vars: vars2, terms: terms2 });
        vars2 = []; terms2 = [];
    }
    let M2: multiTerm = { args: list, constr: constr };
    return M2;
}

function reduce(M: multiTerm, F: tempMultEq[]): void {
    let C: term;
    let Csubterms: term[] = [];
    M.args.forEach(arg => {
        if (arg.vars.length == 0) {
            let M2 = buildMultiTerm(arg.terms);
            reduce(M2, F);
        }
        else {
            F.push(arg);
            arg = { vars: arg.vars, terms: [] }; //?
            if (arg.terms.length > 0) Csubterms.push(arg.terms[0]);
            else Csubterms.push(arg.vars[0]);
        }
    });
    C = { isVar: false, constr: M.constr, subterms: Csubterms, M: [], S: [] };
    console.log(C);
    /*let n = terms2[0].subterms.length;
    for (let i = 0; i < n; i++) {
        let M2: term[] = [];
        let F2: term[] = [];
        let C2: term[] = [];
        terms2.forEach(elem => {
            M2.push(elem.subterms[i]);
        });
        [C2, F2] = reduce(M2, F2);
    }
    C = { isVar: false, constr: terms2[0].constr, subterms: [], M: [], S: [] };
}
else {

    //F = vars2;
    //T.push({vars: vars2, terms: [C], count: 0});
}
/*let constr = {};
let vars2: variable[] = [], terms2: term[] = [];
let C: term;
let n = M[0].subterms.length;
for (let i = 0; i < n; i++) {
    let M2: term[] = [];
    let F2: term[] = [];
    let C2: term[] = [];
    M.forEach(elem => {
        if (elem.isVar) log('Аня где то облажалась');
        let subterm = elem.subterms[i];
        if (subterm.isVar) vars2.push(elem.subterms[i].var!);
        else terms2.push(elem.subterms[i]);
    }); //еле врубилась что такое мультитерм
}*/
    /*M.forEach(arg => {
        if (arg.isVar) {
            vars2.push(arg.var!);
        }
        else {
            if (constr) {
                if (arg.constr != constr) {
                    err = 'unification error: невозможно построить мультитерм конструкторы имеют разные имена';
                    return;
                }
            }
            else constr = arg.constr;
            terms2.push(arg);
        }
    });
    if (err) return [[], []];
    //M.forEach(arg => {
    if (vars2.length == 0) {
        let n = terms2[0].subterms.length;
        for (let i = 0; i < n; i++) {
            let M2: term[] = [];
            let F2: term[] = [];
            let C2: term[] = [];
            terms2.forEach(elem => {
                M2.push(elem.subterms[i]);
            });
            [C2, F2] = reduce(M2, F2);
        }
        C = { isVar: false, constr: terms2[0].constr, subterms: [], M: [], S: [] };
    }
    else {
 
        //F = vars2;
        //T.push({vars: vars2, terms: [C], count: 0});
    }*/
    return;
    //});
}

function buildU(): void {

    let i = 0;
    Object.values(vars).forEach(v => {
        if (v.count != 0) {
            U.push({ vars: [v], terms: v.terms, count: v.count });
            v.M = U[i++];
        }
        if (v.name == 'x0') {
            let M = buildMultiTerm(v.terms);

            if (err) return;
            U.push({ vars: [v], terms: M, count: v.count });
            v.M = U[i++];
        }

    });
}

function findS(): any {
    let curU;
    U.forEach(u => {
        if (u.count == 0) {// && u.terms.length > 1) { 
            curU = u;
            return;
        }
    });
    return curU;
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
    console.log(constructors);
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
    console.log(vars);
}

function parseTerm(str: string): any {
    console.log(str);
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
                        console.log(subterm);
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
