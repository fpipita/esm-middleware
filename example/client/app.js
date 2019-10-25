import _ from "lodash";

document.body.innerHTML = /* HTML */ `
  <div id="heading">
    <h1>esm-middleware example</h1>
    Sum A and B using the Lodash's sum method
  </div>
  <label for="op1">A<input type="number" id="op1"/></label>
  <label for="op2">B<input type="number" id="op2"/></label>
  <div id="result">A + B = <span id="sum"></span></div>
`;

document.addEventListener("input", () => {
  let op1 = Number.parseFloat(document.querySelector("#op1").value);
  let op2 = Number.parseFloat(document.querySelector("#op2").value);
  if (Number.isFinite(op1) && Number.isFinite(op2)) {
    document.querySelector("#sum").textContent = _.sum([op1, op2]);
  }
});
