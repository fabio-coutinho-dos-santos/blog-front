import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPosts, buildR2ImageUrl } from 'app/lib/posts'
import { formatRichContent } from 'app/lib/rich-content'
import Tag from '@/components/Tag'
import siteMetadata from '@/data/siteMetadata'
import { formatDate } from 'pliny/utils/formatDate'
import Image from '@/components/Image'

type PageProps = {
  params: Promise<{ slug: string[] }>
}

function getPostIdFromSlug(slug: string[]): string {
  return decodeURI(slug.join('/')).split('/')[0]
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params
  const postId = getPostIdFromSlug(resolvedParams.slug)
  const posts = await getPosts()
  const post = posts.find((item) => item.id === postId)

  if (!post) {
    return {}
  }

  const imageUrl = buildR2ImageUrl(post.imagePath)
  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      siteName: siteMetadata.title,
      type: 'article',
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
  }
}

export default async function PostDetailsPage({ params }: PageProps) {
  const resolvedParams = await params
  const postId = getPostIdFromSlug(resolvedParams.slug)
  const posts = await getPosts()
  const post = posts.find((item) => item.id === postId)

  if (!post) {
    return notFound()
  }

  const postImageUrl = buildR2ImageUrl(post.imagePath)

  return (
    <article className="mx-auto max-w-3xl py-10">
      <header className="mb-8">
        <time
          dateTime={post.date}
          className="mb-3 block text-base leading-6 font-medium text-gray-500 dark:text-gray-400"
        >
          {formatDate(post.date, siteMetadata.locale)}
        </time>
        <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">{post.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags?.map((tag) => (
            <Tag key={tag} text={tag} />
          ))}
        </div>
      </header>

      {postImageUrl && (
        <div className="mb-8 overflow-hidden rounded-xl">
          <Image
            src={postImageUrl}
            alt={post.title}
            width={1200}
            height={700}
            className="h-auto w-full object-cover"
          />
        </div>
      )}

      <section className="prose dark:prose-invert max-w-none">
        <div dangerouslySetInnerHTML={{ __html: formatRichContent(post.content) }} />
      </section>
    </article>
  )
}
