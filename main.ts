export default {
  fetch: (req, info) => {
    console.log(info, req);
    return Response.json({ msg: "Hello" });
  },
} satisfies Deno.ServeDefaultExport;
