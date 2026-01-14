import { redirect } from "next/navigation";

export default function TournamentSearch() {
  // /tournament-search로 진입한 경우 메인(/home)으로 통일
  redirect("/home");
}
