import { Interview } from "@/components/Interview";

export default async function InterviewPage(props: PageProps<"/interview/[sessionId]">) {
  const { sessionId } = await props.params;
  return <Interview sessionId={sessionId} />;
}
