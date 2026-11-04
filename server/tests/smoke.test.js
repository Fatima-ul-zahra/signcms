import test from "node:test";
import assert from "node:assert/strict";
test("test environment must not target production",()=>{
  const db=process.env.MONGODB_DB||"signcms_dev";
  assert.notEqual(db,"signcms_production");
});
