import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Product not found</h1>
      <p className="mt-2 text-slate-600">It may have been removed or the link is incorrect.</p>
      <Link href="/medicines" className="mt-6 inline-block rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700">
        Browse all medicines
      </Link>
    </main>
  );
}
