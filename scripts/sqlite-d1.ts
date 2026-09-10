import {DatabaseSync} from 'node:sqlite';
export class Statement{
 values:unknown[]=[];constructor(public sql:string,public sqlite:DatabaseSync){}
 bind(...values:unknown[]){const x=new Statement(this.sql,this.sqlite);x.values=values;return x}
 async first(){return this.sqlite.prepare(this.sql).get(...this.values as any[])||null}
 async run(){const result=this.sqlite.prepare(this.sql).run(...this.values as any[]);return {success:true,results:[],meta:{changes:Number(result.changes)}}}
 async all(){return {success:true,results:this.sqlite.prepare(this.sql).all(...this.values as any[]),meta:{}}}
}
export class D1{
 sqlite:DatabaseSync;failNextBatchAt:number|null=null;
 constructor(path:string){this.sqlite=new DatabaseSync(path);this.sqlite.exec('PRAGMA foreign_keys = ON')}
 prepare(sql:string){return new Statement(sql,this.sqlite)}
 async batch(statements:Statement[]){this.sqlite.exec('BEGIN');try{const results=[];for(let i=0;i<statements.length;i++){if(i===this.failNextBatchAt){this.failNextBatchAt=null;throw Error('injected write failure')};const s=statements[i];if(/^SELECT/i.test(s.sql.trim()))results.push({success:true,results:this.sqlite.prepare(s.sql).all(...s.values as any[]),meta:{}});else{const r=this.sqlite.prepare(s.sql).run(...s.values as any[]);results.push({success:true,results:[],meta:{changes:Number(r.changes)}})}}this.sqlite.exec('COMMIT');return results}catch(e){this.sqlite.exec('ROLLBACK');throw e}}
}
