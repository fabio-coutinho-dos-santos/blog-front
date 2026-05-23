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
            Previous
          </button>
        )}
        {prevPage && (
          <Link
            href={currentPage - 1 === 1 ? `/${basePath}/` : `/${basePath}/page/${currentPage - 1}`}
            rel="prev"
          >
            Previous
          </Link>
        )}
        <span>
          {currentPage} of {totalPages}
        </span>
        {!nextPage && (
          <button className="cursor-auto disabled:opacity-50" disabled={!nextPage}>
            Next
          </button>
        )}
        {nextPage && (
          <Link href={`/${basePath}/page/${currentPage + 1}`} rel="next">
            Next
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
        <div className="flex sm:space-x-24">
          <div className="hidden h-full max-h-screen max-w-[280px] min-w-[280px] flex-wrap overflow-auto rounded-sm bg-gray-50 pt-5 shadow-md sm:flex dark:bg-gray-900/70 dark:shadow-gray-800/40">
            <div className="px-6 py-4">
              {activeTag ? (
                <button
                  onClick={clearTagFilter}
                  className="hover:text-primary-500 dark:hover:text-primary-500 cursor-pointer font-bold text-gray-700 uppercase dark:text-gray-300"
                >
                  All Posts
                </button>
              ) : (
                <h3 className="text-primary-500 font-bold uppercase">All Posts</h3>
              )}
              <ul>
                {sortedTags.map((t) => {
                  const selected =
                    activeTag === t || decodeURI(pathname.split('/tags/')[1] || '') === slug(t)
                  return (
                    <li key={t} className="my-3">
                      {selected ? (
                        <h3 className="text-primary-500 inline px-3 py-2 text-sm font-bold uppercase">
                          {`${t} (${tagCounts[t]})`}
                        </h3>
                      ) : (
                        <button
                          type="button"
                          onClick={() => filterByTag(t)}
                          className="hover:text-primary-500 dark:hover:text-primary-500 cursor-pointer px-3 py-2 text-sm font-medium text-gray-500 uppercase dark:text-gray-300"
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
          <div>
            {isFiltering && (
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Filtering posts...</p>
            )}
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {displayPosts.map((post) => {
                const { id, path, date, title, summary, imagePath } = post
                const imageUrl = buildR2ImageUrl(imagePath)
                return (
                  <li key={id} className="py-6">
                    <article className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px] sm:items-center">
                      <div className="space-y-3">
                        <dl>
                          <dt className="sr-only">Published on</dt>
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
                                Edit Post
                              </Link>
                            </div>
                          )}
                        </div>
                        <div className="prose max-w-none text-gray-500 dark:text-gray-400">
                          {summary}
                        </div>
                      </div>
                      {imageUrl && (
                        <div className="sm:justify-self-end">
                          <Image
                            src={imageUrl}
                            alt={title}
                            width={220}
                            height={130}
                            className="h-[130px] w-[220px] rounded-md object-cover"
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
          </div>
        </div>
      </div>
    </>
  )
}
