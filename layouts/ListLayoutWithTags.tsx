'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { slug } from 'github-slugger'
import { formatDate } from 'pliny/utils/formatDate'
import Link from '@/components/Link'
import siteMetadata from '@/data/siteMetadata'
import { buildR2ImageUrl, mapApiPostToFrontPost, type FrontPost } from 'app/lib/posts'
import { useAuth } from 'app/context/auth-context'
import Image from '@/components/Image'

interface PaginationProps {
  totalPages: number
  currentPage: number
}
interface ListLayoutProps {
  posts: FrontPost[]
  title: string
  initialDisplayPosts?: FrontPost[]
  pagination?: PaginationProps
}

function Pagination({ totalPages, currentPage }: PaginationProps) {
  const pathname = usePathname()
  const basePath = pathname
    .replace(/^\//, '')
    .replace(/\/page\/\d+\/?$/, '')
    .replace(/\/$/, '')
  const prevPage = currentPage - 1 > 0
  const nextPage = currentPage + 1 <= totalPages

  return (
    <div className="space-y-2 pt-6 pb-8 md:space-y-5">
      <nav className="flex justify-between">
        {!prevPage && (
          <button className="cursor-auto disabled:opacity-50" disabled={!prevPage}>
            Anterior
          </button>
        )}
        {prevPage && (
          <Link
            href={currentPage - 1 === 1 ? `/${basePath}/` : `/${basePath}/page/${currentPage - 1}`}
            rel="prev"
          >
            Anterior
          </Link>
        )}
        <span>
          {currentPage} de {totalPages}
        </span>
        {!nextPage && (
          <button className="cursor-auto disabled:opacity-50" disabled={!nextPage}>
            Próxima
          </button>
        )}
        {nextPage && (
          <Link href={`/${basePath}/page/${currentPage + 1}`} rel="next">
            Próxima
          </Link>
        )}
      </nav>
    </div>
  )
}

export default function ListLayoutWithTags({
  posts,
  title,
  initialDisplayPosts = [],
  pagination,
}: ListLayoutProps) {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [filteredPosts, setFilteredPosts] = useState<FrontPost[] | null>(null)
  const [isFiltering, setIsFiltering] = useState(false)

  const tagCounts = useMemo(
    () =>
      posts.reduce(
        (acc, post) => {
          post.tags?.forEach((tag) => {
            if (!tag) return
            acc[tag] = (acc[tag] || 0) + 1
          })
          return acc
        },
        {} as Record<string, number>
      ),
    [posts]
  )
  const sortedTags = useMemo(
    () => Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]),
    [tagCounts]
  )

  const baseDisplayPosts = initialDisplayPosts.length > 0 ? initialDisplayPosts : posts
  const displayPosts = filteredPosts ?? baseDisplayPosts

  const filterByTag = async (tag: string) => {
    setIsFiltering(true)
    setActiveTag(tag)
    try {
      const response = await fetch(`/api/posts/search?tag=${encodeURIComponent(tag)}`)
      const data = await response.json()
      if (!response.ok) {
        setFilteredPosts([])
        return
      }

      const rawItems = Array.isArray(data)
        ? data
        : Array.isArray(data?.posts)
          ? data.posts
          : Array.isArray(data?.data)
            ? data.data
            : []

      const normalized = rawItems.map((item: FrontPost | { [key: string]: unknown }) => {
        if (item?.path && item?.summary && item?.date) {
          return item as FrontPost
        }
        return mapApiPostToFrontPost(item as Parameters<typeof mapApiPostToFrontPost>[0])
      })

      setFilteredPosts(normalized)
    } catch {
      setFilteredPosts([])
    } finally {
      setIsFiltering(false)
    }
  }

  const clearTagFilter = () => {
    setActiveTag(null)
    setFilteredPosts(null)
  }

  return (
    <>
      <div>
        <div className="pt-6 pb-6">
          <h1 className="text-3xl leading-9 font-extrabold tracking-tight text-gray-900 sm:hidden sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 dark:text-gray-100">
            {title}
          </h1>
        </div>
        <div className="w-full">
          {isFiltering && (
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Filtrando posts...</p>
          )}
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {displayPosts.map((post) => {
              const { id, path, date, title, summary, imagePath } = post
              const imageUrl = buildR2ImageUrl(imagePath)
              return (
                <li key={id} className="py-8">
                  <article className="grid grid-cols-1 gap-6 sm:grid-cols-[minmax(0,1fr)_400px] sm:items-center">
                    <div className="space-y-4">
                      <dl>
                        <dt className="sr-only">Publicado em</dt>
                        <dd className="text-base leading-6 font-medium text-gray-500 dark:text-gray-400">
                          <time dateTime={date} suppressHydrationWarning>
                            {formatDate(date, siteMetadata.locale)}
                          </time>
                        </dd>
                      </dl>
                      <div>
                        <h2 className="text-2xl leading-8 font-bold tracking-tight">
                          {path ? (
                            <Link href={`/${path}`} className="text-gray-900 dark:text-gray-100">
                              {title}
                            </Link>
                          ) : (
                            <span className="text-gray-900 dark:text-gray-100">{title}</span>
                          )}
                        </h2>
                        {isAuthenticated && pathname.startsWith('/blog') && (
                          <div className="mt-3">
                            <Link
                              href={`/admin/manage-posts?postId=${id}`}
                              className="bg-primary-500 hover:bg-primary-600 inline-flex rounded-md px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Editar Post
                            </Link>
                          </div>
                        )}
                      </div>
                      <div className="prose max-w-none text-lg leading-8 text-gray-500 dark:text-gray-400">
                        {summary}
                      </div>
                      {!!post.tags?.length && (
                        <footer className="flex flex-wrap items-center gap-2 pt-2">
                          {post.tags.map((tag) => (
                            <button
                              key={`${id}-${tag}`}
                              type="button"
                              onClick={() => filterByTag(tag)}
                              className="text-primary-500 hover:bg-primary-500/10 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold tracking-wide uppercase transition-colors dark:border-gray-700"
                              aria-label={`Filter posts by ${tag}`}
                            >
                              {tag}
                            </button>
                          ))}
                        </footer>
                      )}
                    </div>
                    {imageUrl && (
                      <div className="sm:justify-self-end">
                        <Image
                          src={imageUrl}
                          alt={title}
                          width={400}
                          height={240}
                          className="h-[240px] w-full max-w-[400px] rounded-lg object-cover shadow-sm"
                        />
                      </div>
                    )}
                  </article>
                </li>
              )
            })}
          </ul>
          {pagination && pagination.totalPages > 1 && !filteredPosts && (
            <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} />
          )}

          <div className="mt-10 rounded-sm bg-gray-50 p-5 shadow-md dark:bg-gray-900/70 dark:shadow-gray-800/40">
            <div className="mb-4">
              {activeTag ? (
                <button
                  onClick={clearTagFilter}
                  className="hover:text-primary-500 dark:hover:text-primary-500 cursor-pointer font-bold text-gray-700 uppercase dark:text-gray-300"
                >
                  Todos os Posts
                </button>
              ) : (
                <h3 className="text-primary-500 font-bold uppercase">Todos os Posts</h3>
              )}
            </div>
            <ul className="flex flex-wrap gap-2">
              {sortedTags.map((t) => {
                const selected =
                  activeTag === t || decodeURI(pathname.split('/tags/')[1] || '') === slug(t)
                return (
                  <li key={t}>
                    {selected ? (
                      <span className="text-primary-500 inline-flex rounded-full border border-gray-200 px-3 py-1.5 text-xs font-bold tracking-wide uppercase dark:border-gray-700">
                        {`${t} (${tagCounts[t]})`}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => filterByTag(t)}
                        className="hover:text-primary-500 hover:bg-primary-500/10 dark:hover:text-primary-500 cursor-pointer rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium tracking-wide text-gray-500 uppercase transition-colors dark:border-gray-700 dark:text-gray-300"
                        aria-label={`Filter posts by ${t}`}
                      >
                        {`${t} (${tagCounts[t]})`}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
