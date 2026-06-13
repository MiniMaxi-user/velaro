export async function GET() {
  console.log("Orchestrator gestart");

  return Response.json({
    success: true,
    message: "Orchestrator werkt"
  });
}